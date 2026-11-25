import dns from "node:dns";
import { ApiHandlerError } from "./errors";

// Ensure IPv4 first on Node.js to prevent IPv6 timeout on Windows
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

export interface OpenAQPollutant {
  parameter: string;         // e.g. "pm25", "pm10", "no2", "so2", "co", "o3"
  displayName: string;       // e.g. "PM2.5", "PM10"
  value: number;             // verified observed concentration
  unit: string;              // e.g. "µg/m³", "ppb", "ppm"
  observedAtUtc: string;     // ISO timestamp of physical measurement
  observedAtLocal?: string;  // Local station time
  sensorId: number;
}

export type FreshnessCategory =
  | "live"      // <= 3 hours
  | "recent"    // 3 - 12 hours
  | "delayed"   // 12 - 24 hours
  | "stale";    // > 24 hours

interface OpenAQSensor {
  id: number;
  parameter?: {
    name?: string;
    displayName?: string;
    units?: string;
  };
}

interface OpenAQLocationItem {
  id: number;
  name: string;
  distance?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  provider?: {
    name?: string;
  };
  owner?: {
    name?: string;
  };
  datetimeLast?: {
    utc?: string;
    local?: string;
  };
  timezone?: string;
  sensors?: OpenAQSensor[];
}

interface OpenAQLocationsResponse {
  results?: OpenAQLocationItem[];
}

interface OpenAQMeasurementItem {
  sensorsId: number;
  value: number;
  datetime?: {
    utc?: string;
    local?: string;
  };
}

interface OpenAQLatestResponse {
  results?: OpenAQMeasurementItem[];
}

export interface IndianNaqiDetails {
  isAvailable: boolean;
  unavailableReason?: string;
  overallAqi: number | null;
  category: string;
  color: string;
  responsiblePollutant: string | null;
  criteriaPollutantsCount: number;
  hasSufficientPollutants: boolean; // >= 3 criteria pollutants including PM2.5 or PM10
  averagingNote: string;
}

export interface StationObservationResponse {
  isAvailable: boolean;
  unavailableReason?: string;
  requestedLocation: {
    city?: string;
    latitude: number;
    longitude: number;
  };
  station?: {
    id: number;
    name: string;
    distanceMeters: number;
    distanceKm: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    provider: string;
    owner?: string;
    lastReportUtc?: string;
    timezone: string;
  };
  pollutants: OpenAQPollutant[];
  pm25: OpenAQPollutant | null;
  pm10: OpenAQPollutant | null;
  freshness: {
    category: FreshnessCategory;
    label: string;
    hoursAgo: number | null;
    mostRecentUtc: string | null;
  };
  naqi?: IndianNaqiDetails;
  retrievedAtUtc: string;
}

/**
 * Calculates Indian NAQI for PM2.5 based on CPCB standard breakpoints.
 * Breakpoints for 24h avg:
 * Good: 0-30 -> 0-50
 * Satisfactory: 31-60 -> 51-100
 * Moderate: 61-90 -> 101-200
 * Poor: 91-120 -> 201-300
 * Very Poor: 121-250 -> 301-400
 * Severe: 250+ -> 401-500
 */
function calculatePm25SubIndex(conc: number): number {
  if (conc <= 30) return Math.round((conc / 30) * 50);
  if (conc <= 60) return Math.round(50 + ((conc - 30) / 30) * 50);
  if (conc <= 90) return Math.round(100 + ((conc - 60) / 30) * 100);
  if (conc <= 120) return Math.round(200 + ((conc - 90) / 30) * 100);
  if (conc <= 250) return Math.round(300 + ((conc - 120) / 130) * 100);
  return Math.min(500, Math.round(400 + ((conc - 250) / 130) * 100));
}

/**
 * Calculates Indian NAQI for PM10 based on CPCB standard breakpoints.
 * Good: 0-50 -> 0-50
 * Satisfactory: 51-100 -> 51-100
 * Moderate: 101-250 -> 101-200
 * Poor: 251-350 -> 201-300
 * Very Poor: 351-430 -> 301-400
 * Severe: 430+ -> 401-500
 */
function calculatePm10SubIndex(conc: number): number {
  if (conc <= 50) return Math.round(conc);
  if (conc <= 100) return Math.round(conc);
  if (conc <= 250) return Math.round(100 + ((conc - 100) / 150) * 100);
  if (conc <= 350) return Math.round(200 + ((conc - 250) / 100) * 100);
  if (conc <= 430) return Math.round(300 + ((conc - 350) / 80) * 100);
  return Math.min(500, Math.round(400 + ((conc - 430) / 70) * 100));
}

/**
 * Calculates Indian NAQI for NO2 based on CPCB standard breakpoints (24h avg, µg/m³).
 */
function calculateNo2SubIndex(conc: number): number {
  if (conc <= 40) return Math.round((conc / 40) * 50);
  if (conc <= 80) return Math.round(50 + ((conc - 40) / 40) * 50);
  if (conc <= 180) return Math.round(100 + ((conc - 80) / 100) * 100);
  if (conc <= 280) return Math.round(200 + ((conc - 180) / 100) * 100);
  if (conc <= 400) return Math.round(300 + ((conc - 280) / 120) * 100);
  return Math.min(500, Math.round(400 + ((conc - 400) / 100) * 100));
}

/**
 * Calculates Indian NAQI for SO2 based on CPCB standard breakpoints (24h avg, µg/m³).
 */
function calculateSo2SubIndex(conc: number): number {
  if (conc <= 40) return Math.round((conc / 40) * 50);
  if (conc <= 80) return Math.round(50 + ((conc - 40) / 40) * 50);
  if (conc <= 380) return Math.round(100 + ((conc - 80) / 300) * 100);
  if (conc <= 800) return Math.round(200 + ((conc - 380) / 420) * 100);
  if (conc <= 1600) return Math.round(300 + ((conc - 800) / 800) * 100);
  return Math.min(500, Math.round(400 + ((conc - 1600) / 800) * 100));
}

/**
 * Calculates Indian NAQI for Ozone (O3) based on CPCB standard breakpoints (8h avg, µg/m³).
 */
function calculateO3SubIndex(conc: number): number {
  if (conc <= 50) return Math.round(conc);
  if (conc <= 100) return Math.round(conc);
  if (conc <= 168) return Math.round(100 + ((conc - 100) / 68) * 100);
  if (conc <= 208) return Math.round(200 + ((conc - 168) / 40) * 100);
  if (conc <= 748) return Math.round(300 + ((conc - 208) / 540) * 100);
  return Math.min(500, Math.round(400 + ((conc - 748) / 252) * 100));
}

function getNaqiCategory(aqi: number) {
  if (aqi <= 50) return { category: "Good", color: "#2E7D4E" };
  if (aqi <= 100) return { category: "Satisfactory", color: "#5A8B35" };
  if (aqi <= 200) return { category: "Moderate", color: "#B8860B" };
  if (aqi <= 300) return { category: "Poor", color: "#C65D28" };
  if (aqi <= 400) return { category: "Very Poor", color: "#B93838" };
  return { category: "Severe", color: "#731E1E" };
}

/**
 * Scores an OpenAQ monitoring station based on freshness, pollutant capabilities, and proximity.
 */
function scoreStation(loc: OpenAQLocationItem, nowUtcMs: number): number {
  let score = 0;

  if (loc.datetimeLast?.utc) {
    const lastTime = new Date(loc.datetimeLast.utc).getTime();
    const hoursAgo = Math.max(0, (nowUtcMs - lastTime) / (1000 * 60 * 60));

    if (hoursAgo <= 4) {
      score += 15000 - hoursAgo * 200;
    } else if (hoursAgo <= 12) {
      score += 8000 - hoursAgo * 100;
    } else if (hoursAgo <= 24) {
      score += 4000 - hoursAgo * 50;
    } else if (hoursAgo <= 168) {
      score += 1000;
    }
  }

  // Pollutant capabilities
  const hasPm25 = loc.sensors?.some((s: OpenAQSensor) => s.parameter?.name === "pm25");
  const hasPm10 = loc.sensors?.some((s: OpenAQSensor) => s.parameter?.name === "pm10");
  const hasNo2 = loc.sensors?.some((s: OpenAQSensor) => s.parameter?.name === "no2");

  if (hasPm25) score += 3000;
  if (hasPm10) score += 1500;
  if (hasNo2) score += 500;

  // Proximity penalty (closer stations score higher)
  const distKm = (loc.distance || 0) / 1000;
  score -= distKm * 35;

  return score;
}

/**
 * Fetches real monitoring-station observations near specified Indian coordinates.
 */
export async function getOpenAQObservations(
  latitude: number,
  longitude: number,
  city?: string,
  apiKey?: string
): Promise<StationObservationResponse> {
  const key = apiKey || process.env.OPENAQ_API_KEY;
  if (!key) {
    throw new ApiHandlerError(
      500,
      "OPENAQ_API_KEY is not configured on the server. Please add it to your environment."
    );
  }

  const retrievedAtUtc = new Date().toISOString();
  const nowMs = Date.now();

  // Search for nearby stations within OpenAQ v3 max radius (25,000 meters / 25km)
  const locationsUrl = `https://api.openaq.org/v3/locations?coordinates=${latitude},${longitude}&radius=25000&limit=30`;

  let locResponse: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    locResponse = await fetch(locationsUrl, {
      signal: controller.signal,
      headers: {
        "X-API-Key": key,
        Accept: "application/json",
        "User-Agent": "VayuVerse-CleanAirNavigator/1.0",
      },
    });
    clearTimeout(timeout);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiHandlerError(504, "OpenAQ API request timed out after 8 seconds.");
    }
    throw new ApiHandlerError(502, "Failed to connect to OpenAQ API", err);
  }

  if (!locResponse.ok) {
    if (locResponse.status === 401 || locResponse.status === 403) {
      throw new ApiHandlerError(502, "OpenAQ API authentication failed with provided key.");
    }
    throw new ApiHandlerError(
      locResponse.status,
      `OpenAQ API returned error code ${locResponse.status}`
    );
  }

  let locData: OpenAQLocationsResponse;
  try {
    locData = (await locResponse.json()) as OpenAQLocationsResponse;
  } catch (err) {
    throw new ApiHandlerError(502, "Failed to parse OpenAQ response JSON", err);
  }

  const rawStations = locData.results;
  if (!rawStations || !Array.isArray(rawStations) || rawStations.length === 0) {
    return {
      isAvailable: false,
      unavailableReason: `No verified OpenAQ monitoring stations found within 25 km of ${city || "this location"}.`,
      requestedLocation: { city, latitude, longitude },
      pollutants: [],
      pm25: null,
      pm10: null,
      freshness: {
        category: "stale",
        label: "No Station",
        hoursAgo: null,
        mostRecentUtc: null,
      },
      retrievedAtUtc,
    };
  }

  // Rank candidate stations
  const rankedStations = rawStations
    .map((s: OpenAQLocationItem) => ({
      ...s,
      _score: scoreStation(s, nowMs),
    }))
    .sort((a, b) => b._score - a._score);

  const bestStation = rankedStations[0];
  if (!bestStation) {
    return {
      isAvailable: false,
      unavailableReason: "No suitable reporting stations available.",
      requestedLocation: { city, latitude, longitude },
      pollutants: [],
      pm25: null,
      pm10: null,
      freshness: {
        category: "stale",
        label: "No Station",
        hoursAgo: null,
        mostRecentUtc: null,
      },
      retrievedAtUtc,
    };
  }

  // Fetch latest measurements for the top-ranked station
  const latestUrl = `https://api.openaq.org/v3/locations/${bestStation.id}/latest`;

  let latestResponse: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    latestResponse = await fetch(latestUrl, {
      signal: controller.signal,
      headers: {
        "X-API-Key": key,
        Accept: "application/json",
        "User-Agent": "VayuVerse-CleanAirNavigator/1.0",
      },
    });
    clearTimeout(timeout);
  } catch (err) {
    throw new ApiHandlerError(502, "Failed to fetch station latest measurements", err);
  }

  if (!latestResponse.ok) {
    throw new ApiHandlerError(
      latestResponse.status,
      `OpenAQ returned status ${latestResponse.status} for station latest measurements.`
    );
  }

  const latestData = (await latestResponse.json()) as OpenAQLatestResponse;
  const rawMeasurements = latestData.results || [];

  if (!Array.isArray(rawMeasurements) || rawMeasurements.length === 0) {
    return {
      isAvailable: false,
      unavailableReason: `Station ${bestStation.name} has no recent measurements recorded.`,
      requestedLocation: { city, latitude, longitude },
      station: {
        id: bestStation.id,
        name: bestStation.name,
        distanceMeters: Math.round(bestStation.distance || 0),
        distanceKm: Number(((bestStation.distance || 0) / 1000).toFixed(2)),
        coordinates: {
          latitude: bestStation.coordinates?.latitude || latitude,
          longitude: bestStation.coordinates?.longitude || longitude,
        },
        provider: bestStation.provider?.name || "CPCB / SPCB",
        owner: bestStation.owner?.name,
        lastReportUtc: bestStation.datetimeLast?.utc,
        timezone: bestStation.timezone || "Asia/Kolkata",
      },
      pollutants: [],
      pm25: null,
      pm10: null,
      freshness: {
        category: "stale",
        label: "No Recent Telemetry",
        hoursAgo: null,
        mostRecentUtc: null,
      },
      retrievedAtUtc,
    };
  }

  // Create sensor ID to parameter descriptor map
  const sensorMap = new Map<number, OpenAQSensor>();
  for (const s of bestStation.sensors || []) {
    sensorMap.set(s.id, s);
  }

  // Group measurements by parameter name, keeping the newest observation timestamp
  const paramMap = new Map<string, OpenAQPollutant>();
  let newestObsUtc: string | null = null;
  let newestObsMs = 0;

  for (const m of rawMeasurements) {
    if (typeof m.value !== "number" || isNaN(m.value) || m.value < 0) {
      continue; // Filter out negative or invalid sensor artifacts
    }

    const sensor = sensorMap.get(m.sensorsId);
    const paramName = sensor?.parameter?.name || "unknown";
    const displayName = sensor?.parameter?.displayName || paramName.toUpperCase();
    const unit = sensor?.parameter?.units || "µg/m³";
    const obsUtc = m.datetime?.utc || "";
    const obsMs = obsUtc ? new Date(obsUtc).getTime() : 0;

    if (obsMs > newestObsMs) {
      newestObsMs = obsMs;
      newestObsUtc = obsUtc;
    }

    const currentBest = paramMap.get(paramName);
    if (!currentBest || (obsMs > new Date(currentBest.observedAtUtc).getTime())) {
      paramMap.set(paramName, {
        parameter: paramName,
        displayName,
        value: Number(m.value.toFixed(2)),
        unit,
        observedAtUtc: obsUtc,
        observedAtLocal: m.datetime?.local,
        sensorId: m.sensorsId,
      });
    }
  }

  const pollutants = Array.from(paramMap.values());
  const pm25 = paramMap.get("pm25") || null;
  const pm10 = paramMap.get("pm10") || null;

  // Calculate freshness category
  let freshnessCategory: FreshnessCategory = "stale";
  let freshnessLabel = "Offline / Historical";
  let hoursAgo: number | null = null;

  if (newestObsMs > 0) {
    hoursAgo = Number(((nowMs - newestObsMs) / (1000 * 60 * 60)).toFixed(1));
    if (hoursAgo <= 3) {
      freshnessCategory = "live";
      freshnessLabel = "Live Telemetry";
    } else if (hoursAgo <= 12) {
      freshnessCategory = "recent";
      freshnessLabel = "Recent (< 12h)";
    } else if (hoursAgo <= 24) {
      freshnessCategory = "delayed";
      freshnessLabel = "Delayed (< 24h)";
    } else {
      freshnessCategory = "stale";
      freshnessLabel = "Delayed (> 24h)";
    }
  }

  // Evaluate CPCB Criteria Pollutants Sufficiency
  // CPCB Standard requires a minimum of 3 criteria pollutants with at least one PM (PM2.5 or PM10)
  const criteriaKeys = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3", "pb"];
  const criteriaPollutants = pollutants.filter((p) =>
    criteriaKeys.includes(p.parameter.toLowerCase())
  );
  const hasPm = Boolean(pm25 || pm10);
  const hasSufficientPollutants = criteriaPollutants.length >= 3 && hasPm;

  let naqi: IndianNaqiDetails;

  if (!hasSufficientPollutants) {
    naqi = {
      isAvailable: false,
      unavailableReason: `Official CPCB Indian AQI requires a minimum of 3 criteria pollutants including PM2.5 or PM10 (this station monitors ${criteriaPollutants.length}). Verified individual concentrations are displayed separately.`,
      overallAqi: null,
      category: "Unavailable",
      color: "#526161",
      responsiblePollutant: null,
      criteriaPollutantsCount: criteriaPollutants.length,
      hasSufficientPollutants: false,
      averagingNote:
        "CPCB National AQI methodology requires a minimum of 3 criteria pollutants with at least one PM.",
    };
  } else {
    let maxAqi = 0;
    let respPollutant = "";

    if (pm25 && pm25.unit.includes("µg")) {
      const pm25Sub = calculatePm25SubIndex(pm25.value);
      if (pm25Sub > maxAqi) {
        maxAqi = pm25Sub;
        respPollutant = "PM2.5";
      }
    }

    if (pm10 && pm10.unit.includes("µg")) {
      const pm10Sub = calculatePm10SubIndex(pm10.value);
      if (pm10Sub > maxAqi) {
        maxAqi = pm10Sub;
        respPollutant = "PM10";
      }
    }

    const no2 = paramMap.get("no2");
    if (no2 && no2.unit.includes("µg")) {
      const no2Sub = calculateNo2SubIndex(no2.value);
      if (no2Sub > maxAqi) {
        maxAqi = no2Sub;
        respPollutant = "NO₂";
      }
    }

    const so2 = paramMap.get("so2");
    if (so2 && so2.unit.includes("µg")) {
      const so2Sub = calculateSo2SubIndex(so2.value);
      if (so2Sub > maxAqi) {
        maxAqi = so2Sub;
        respPollutant = "SO₂";
      }
    }

    const o3 = paramMap.get("o3");
    if (o3 && o3.unit.includes("µg")) {
      const o3Sub = calculateO3SubIndex(o3.value);
      if (o3Sub > maxAqi) {
        maxAqi = o3Sub;
        respPollutant = "Ozone";
      }
    }

    if (maxAqi > 0) {
      const { category, color } = getNaqiCategory(maxAqi);
      naqi = {
        isAvailable: true,
        overallAqi: maxAqi,
        category,
        color,
        responsiblePollutant: respPollutant,
        criteriaPollutantsCount: criteriaPollutants.length,
        hasSufficientPollutants: true,
        averagingNote:
          "Calculated using official CPCB piecewise-linear breakpoints on verified 1-hour station telemetry. Official CPCB daily composite bulletin requires 24-hour continuous monitoring coverage.",
      };
    } else {
      naqi = {
        isAvailable: false,
        unavailableReason: "Sub-indices could not be formed from current readings.",
        overallAqi: null,
        category: "Unavailable",
        color: "#526161",
        responsiblePollutant: null,
        criteriaPollutantsCount: criteriaPollutants.length,
        hasSufficientPollutants: true,
        averagingNote: "Awaiting valid sub-indices.",
      };
    }
  }

  return {
    isAvailable: true,
    requestedLocation: { city, latitude, longitude },
    station: {
      id: bestStation.id,
      name: bestStation.name,
      distanceMeters: Math.round(bestStation.distance || 0),
      distanceKm: Number(((bestStation.distance || 0) / 1000).toFixed(2)),
      coordinates: {
        latitude: bestStation.coordinates?.latitude || latitude,
        longitude: bestStation.coordinates?.longitude || longitude,
      },
      provider: bestStation.provider?.name || "CPCB / SPCB",
      owner: bestStation.owner?.name,
      lastReportUtc: bestStation.datetimeLast?.utc,
      timezone: bestStation.timezone || "Asia/Kolkata",
    },
    pollutants,
    pm25,
    pm10,
    freshness: {
      category: freshnessCategory,
      label: freshnessLabel,
      hoursAgo,
      mostRecentUtc: newestObsUtc,
    },
    naqi,
    retrievedAtUtc,
  };
}
