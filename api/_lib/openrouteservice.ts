/**
 * OpenRouteService (ORS) Directions API Client
 * Enterprise-grade routing integration with cost controls, caching, rate-limiting,
 * versioned ARAI/CPCB transport emissions calculation, and environmental exposure proxies.
 */

import type {
  ComputeRoutesRequest,
  ComputeRoutesResponse,
  ComputedRoute,
  RouteStep,
  RouteTravelMode,
} from "../../src/types/routes.js";

const ORS_BASE_URL =
  process.env.OPENROUTESERVICE_BASE_URL ||
  "https://api.heigit.org/openrouteservice";

// India Bounding Box for coordinate validation (lat: 6.0 to 38.0, lng: 68.0 to 98.0)
const INDIA_BOUNDS = {
  minLat: 6.0,
  maxLat: 38.0,
  minLng: 68.0,
  maxLng: 98.0,
};

/**
 * In-memory LRU / TTL Cache to minimize repeated OpenRouteService queries
 */
interface CacheEntry {
  response: ComputeRoutesResponse;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();

export function _clearRouteCacheForTesting(): void {
  routeCache.clear();
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const MAX_CACHE_ENTRIES = 200;

/**
 * Rate Limiter: Conservative 30 requests per minute to stay safely within ORS quotas
 */
const requestTimestamps: number[] = [];
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(): boolean {
  const now = Date.now();
  while (
    requestTimestamps.length > 0 &&
    (requestTimestamps[0] ?? 0) < now - RATE_LIMIT_WINDOW_MS
  ) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  requestTimestamps.push(now);
  return true;
}

/**
 * Maps VayuVerse RouteTravelMode to OpenRouteService API profile
 */
export function mapModeToOrsProfile(mode: RouteTravelMode): {
  profile: string | null;
  isSupported: boolean;
  unsupportedReason?: string;
} {
  switch (mode) {
    case "DRIVE":
      return { profile: "driving-car", isSupported: true };
    case "TWO_WHEELER":
      // ORS public API utilizes driving-car road geometry for two-wheelers in India
      return { profile: "driving-car", isSupported: true };
    case "WALK":
      return { profile: "foot-walking", isSupported: true };
    case "BICYCLE":
      return { profile: "cycling-regular", isSupported: true };
    case "TRANSIT":
      return {
        profile: null,
        isSupported: false,
        unsupportedReason:
          "Public transit route planning is currently unavailable with OpenRouteService. ORS provides road, pedestrian, and cycling routing; scheduled public-transit routing requires a dedicated municipal transit authority GTFS feed.",
      };
    default:
      return { profile: "driving-car", isSupported: true };
  }
}

/**
 * Calculates versioned ARAI/CPCB carbon emissions for a given mode and distance
 */
export function calculateRouteEmissions(
  mode: RouteTravelMode,
  distanceKm: number
): { emissionsGramsCo2: number; citation: string } {
  switch (mode) {
    case "DRIVE":
      // CPCB Indian Passenger Car average: 140 g CO2 / p-km (petrol/diesel BS-VI internal combustion engine, 1.2 passengers average occupancy)
      return {
        emissionsGramsCo2: Math.round(distanceKm * 140),
        citation:
          "CPCB Urban Vehicle Emissions Inventory (140 g CO₂/p-km; assumed petrol/diesel BS-VI ICE passenger car, 1.2 average occupancy)",
      };
    case "TWO_WHEELER":
      // ARAI BS-VI Motorcycle/Scooter: 45 g CO2 / p-km (single rider)
      return {
        emissionsGramsCo2: Math.round(distanceKm * 45),
        citation:
          "ARAI BS-VI Two-Wheeler Standard (45 g CO₂/p-km; single rider operational baseline)",
      };
    case "TRANSIT":
      // Electric Metro Baseline: 12 g CO2 / p-km
      return {
        emissionsGramsCo2: Math.round(distanceKm * 12),
        citation:
          "DMRC Clean Development Mechanism / India GHG (12 g CO₂/p-km)",
      };
    case "WALK":
      return {
        emissionsGramsCo2: 0,
        citation:
          "Active Pedestrian Mobility: 0 g direct tailpipe emissions (~0.05 g CO₂e/km dietary/lifecycle metabolic baseline)",
      };
    case "BICYCLE":
      return {
        emissionsGramsCo2: 0,
        citation:
          "Active Cycling Mobility: 0 g direct operational tailpipe emissions (~5 g CO₂e/km manufacturing and dietary lifecycle estimate)",
      };
    default:
      return {
        emissionsGramsCo2: Math.round(distanceKm * 140),
        citation: "CPCB Baseline Fleet Average Factor (140 g CO₂/p-km)",
      };
  }
}

/**
 * Computes Concentration-Time Exposure Proxy (µg·h/m³)
 */
export function calculateRouteExposureProxy(
  mode: RouteTravelMode,
  totalDurationMin: number,
  walkingDurationMin: number,
  predictedPm25?: number
): number | null {
  if (!predictedPm25 || predictedPm25 <= 0) return null;

  const walkingHours = walkingDurationMin / 60;
  const inVehicleHours = Math.max(0, (totalDurationMin - walkingDurationMin) / 60);

  // Microenvironment attenuation factors:
  // Metro: 0.20, Car AC cabin: 0.50, Walking: 1.00, Two-wheeler: 1.00, Bicycle: 1.00
  let vehicleFactor = 0.5;
  if (mode === "TRANSIT") vehicleFactor = 0.20;
  if (mode === "TWO_WHEELER") vehicleFactor = 1.0;
  if (mode === "WALK" || mode === "BICYCLE") vehicleFactor = 1.0;

  const exposure =
    predictedPm25 * walkingHours * 1.0 +
    predictedPm25 * inVehicleHours * vehicleFactor;

  return Math.round(exposure * 10) / 10;
}

/**
 * Primary OpenRouteService API Query Engine
 */
export async function computeOpenRouteServiceRoutes(
  req: ComputeRoutesRequest,
  apiKeyOverride?: string
): Promise<ComputeRoutesResponse> {
  const apiKey =
    apiKeyOverride !== undefined
      ? apiKeyOverride
      : (process.env.OPENROUTESERVICE_API_KEY || "");

  const origin = req.origin;
  const destination = req.destination;
  const mode = req.travelMode || "DRIVE";

  // 1. Check Configuration Fallback
  if (!apiKey) {
    return {
      isConfigured: false,
      isAvailable: false,
      status: "unconfigured",
      routes: [],
      selectedMode: mode,
      origin,
      destination,
      provider: "OpenRouteService via HeiGIT",
      message:
        "OpenRouteService is not configured on the server. Please set the OPENROUTESERVICE_API_KEY environment variable to enable live multi-modal route calculations.",
      uncertaintyNotes: [
        "Real-time turn-by-turn road, walking, and cycling routing requires the OpenRouteService API key.",
        "Departure time What-If comparisons and CAMS atmospheric dispersion analyses remain fully active in offline estimation mode.",
      ],
    };
  }

  // 2. Validate Coordinates
  if (
    origin.latitude < INDIA_BOUNDS.minLat ||
    origin.latitude > INDIA_BOUNDS.maxLat ||
    origin.longitude < INDIA_BOUNDS.minLng ||
    origin.longitude > INDIA_BOUNDS.maxLng ||
    destination.latitude < INDIA_BOUNDS.minLat ||
    destination.latitude > INDIA_BOUNDS.maxLat ||
    destination.longitude < INDIA_BOUNDS.minLng ||
    destination.longitude > INDIA_BOUNDS.maxLng
  ) {
    throw new Error(
      "Origin and destination coordinates must be within the geographical bounds of India (lat: 6.0–38.0, lng: 68.0–98.0)."
    );
  }

  // 3. Handle Unsupported Mode: Public Transit
  const modeMapping = mapModeToOrsProfile(mode);
  if (!modeMapping.isSupported || !modeMapping.profile) {
    return {
      isConfigured: true,
      isAvailable: false,
      status: "unsupported_mode",
      routes: [],
      selectedMode: mode,
      origin,
      destination,
      provider: "OpenRouteService via HeiGIT",
      message: modeMapping.unsupportedReason,
      uncertaintyNotes: [
        "OpenRouteService specializes in road network, pedestrian, and cycling geometries.",
        "Public transit route planning (bus, metro) requires an independent GTFS transit authority provider.",
      ],
    };
  }

  // 4. Check Cache (keyed by corridor, mode, and key fingerprint to isolate test overrides)
  const keyFingerprint = apiKey ? apiKey.slice(-6) : "none";
  const cacheKey = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(
    4
  )}->${destination.latitude.toFixed(4)},${destination.longitude.toFixed(
    4
  )}_${mode}_${keyFingerprint}`;

  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }

  // 5. Rate Limiting Check
  if (!checkRateLimit()) {
    return {
      isConfigured: true,
      isAvailable: false,
      status: "rate_limited",
      routes: [],
      selectedMode: mode,
      origin,
      destination,
      provider: "OpenRouteService via HeiGIT",
      message:
        "OpenRouteService API query rate limit exceeded (maximum 30 requests/minute). Please retry momentarily.",
      uncertaintyNotes: [
        "Queries are throttled to ensure cost controls and provider compliance.",
      ],
    };
  }

  // 6. Build OpenRouteService Request Body
  // In OpenRouteService: coordinates are in [longitude, latitude] order
  const requestBody: Record<string, unknown> = {
    coordinates: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
    alternative_routes: { target_count: 2 },
    instructions: true,
    geometry: true,
  };

  const endpoint = `${ORS_BASE_URL}/v2/directions/${modeMapping.profile}/geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json, application/geo+json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle Rate Limiting from Provider
    if (response.status === 429) {
      return {
        isConfigured: true,
        isAvailable: false,
        status: "rate_limited",
        routes: [],
        selectedMode: mode,
        origin,
        destination,
        provider: "OpenRouteService via HeiGIT",
        message:
          "OpenRouteService rate limit reached (HTTP 429). Please retry momentarily.",
        uncertaintyNotes: [
          "Provider returned HTTP 429 Too Many Requests.",
        ],
      };
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      let errorMsg = `OpenRouteService API error (HTTP ${response.status})`;
      if (errorJson?.error?.message) {
        errorMsg = errorJson.error.message;
      } else if (typeof errorJson?.error === "string") {
        errorMsg = errorJson.error;
      }

      if (response.status === 404 || errorJson?.error?.code === 2010) {
        return {
          isConfigured: true,
          isAvailable: false,
          status: "no_routes_found",
          routes: [],
          selectedMode: mode,
          origin,
          destination,
          provider: "OpenRouteService via HeiGIT",
          message:
            errorMsg ||
            "No route found between the specified coordinates for this transport profile.",
          uncertaintyNotes: [
            "Coordinates may be isolated from the routable road network.",
          ],
        };
      }

      return {
        isConfigured: true,
        isAvailable: false,
        status: "error",
        routes: [],
        selectedMode: mode,
        origin,
        destination,
        provider: "OpenRouteService via HeiGIT",
        message: errorMsg,
        uncertaintyNotes: [
          `Upstream provider error code HTTP ${response.status}.`,
        ],
      };
    }

    const data = await response.json();
    const features: Array<{
      geometry?: { coordinates?: Array<[number, number]> };
      properties?: {
        summary?: { distance?: number; duration?: number };
        segments?: Array<{
          distance?: number;
          duration?: number;
          steps?: Array<{
            distance?: number;
            duration?: number;
            instruction?: string;
            name?: string;
          }>;
        }>;
      };
    }> = data.features || [];

    if (features.length === 0) {
      return {
        isConfigured: true,
        isAvailable: true,
        status: "no_routes_found",
        routes: [],
        selectedMode: mode,
        origin,
        destination,
        provider: "OpenRouteService via HeiGIT",
        message: "No routes found between these locations.",
        uncertaintyNotes: [],
      };
    }

    // 7. Transform OpenRouteService Features into Normalized VayuVerse ComputedRoute Schema
    const computedRoutes: ComputedRoute[] = features.map((feat, idx) => {
      const summary = feat.properties?.summary || {};
      const distanceMeters = Math.round(summary.distance || 0);
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const durationSeconds = Math.round(summary.duration || 0);
      const durationMinutes = Math.round(durationSeconds / 60);

      // Extract geometry: ORS GeoJSON provides coordinates as [lng, lat]
      // Map to Leaflet [lat, lng] format
      const rawCoords = feat.geometry?.coordinates || [];
      const polyline: Array<[number, number]> = rawCoords.map((pt) => [
        pt[1], // latitude
        pt[0], // longitude
      ]);

      // Extract Steps
      const steps: RouteStep[] = [];
      const segments = feat.properties?.segments || [];
      for (const seg of segments) {
        for (const step of seg.steps || []) {
          steps.push({
            instruction: step.instruction || step.name || "Proceed",
            distanceMeters: Math.round(step.distance || 0),
            staticDurationSeconds: Math.round(step.duration || 0),
            travelMode: mode,
          });
        }
      }

      const walkingDistanceMeters = mode === "WALK" ? distanceMeters : 0;
      const walkingDurationMinutes = mode === "WALK" ? durationMinutes : 0;

      // Calculate emissions
      const { emissionsGramsCo2, citation } = calculateRouteEmissions(
        mode,
        distanceKm
      );

      // Calculate exposure proxy
      const exposureProxyUghM3 = calculateRouteExposureProxy(
        mode,
        durationMinutes,
        walkingDurationMinutes,
        req.predictedPm25
      );

      const routeLabel =
        idx === 0
          ? `Primary Route (${mode.replace("_", " ")})`
          : `Alternative Route ${idx} (${mode.replace("_", " ")})`;

      return {
        id: `ors-route-${mode.toLowerCase()}-${idx}-${Date.now().toString(36)}`,
        routeIndex: idx,
        summary: routeLabel,
        travelMode: mode,
        distanceMeters,
        distanceKm,
        durationSeconds,
        durationMinutes,
        polyline,
        encodedPolyline: "",
        walkingDistanceMeters,
        walkingDurationMinutes,
        transitChangesCount: 0,
        steps,
        emissionsGramsCo2,
        emissionsFactorCitation: citation,
        exposureProxyUghM3,
        warnings: [],
      };
    });

    const finalResponse: ComputeRoutesResponse = {
      isConfigured: true,
      isAvailable: true,
      status: "success",
      routes: computedRoutes,
      selectedMode: mode,
      origin,
      destination,
      provider: "OpenRouteService via HeiGIT",
      cachedAt: new Date().toISOString(),
      uncertaintyNotes: [
        "OpenRouteService route durations reflect standard speed limits and walking paces, not real-time live traffic congestion.",
        "Emissions are calculated using documented ARAI / CPCB fleet factors and assume typical passenger occupancy.",
        "Route exposure proxy is an atmospheric concentration-time estimate based on CAMS regional forecast, not in-situ personal biometric inhalation.",
      ],
    };

    // Store in cache (manage max entries)
    if (routeCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = routeCache.keys().next().value;
      if (oldestKey) routeCache.delete(oldestKey);
    }
    routeCache.set(cacheKey, {
      response: finalResponse,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return finalResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if ((err as Error)?.name === "AbortError") {
      return {
        isConfigured: true,
        isAvailable: false,
        status: "error",
        routes: [],
        selectedMode: mode,
        origin,
        destination,
        provider: "OpenRouteService via HeiGIT",
        message: "OpenRouteService API connection timed out after 12 seconds.",
        uncertaintyNotes: [
          "Network timeout contacting api.heigit.org/openrouteservice.",
        ],
      };
    }

    return {
      isConfigured: true,
      isAvailable: false,
      status: "error",
      routes: [],
      selectedMode: mode,
      origin,
      destination,
      provider: "OpenRouteService via HeiGIT",
      message:
        (err as Error).message ||
        "Unknown error connecting to OpenRouteService API.",
      uncertaintyNotes: [
        "Network failure reaching api.heigit.org/openrouteservice.",
      ],
    };
  }
}
