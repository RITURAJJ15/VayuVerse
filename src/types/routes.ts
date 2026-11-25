/**
 * VayuVerse Routing & Travel Alternatives Domain Types
 * Conforms to OpenRouteService API (HeiGIT) specifications.
 */

export type RouteTravelMode =
  | "DRIVE"
  | "TWO_WHEELER"
  | "TRANSIT"
  | "WALK"
  | "BICYCLE";

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface RouteLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteTransitStop {
  name: string;
  location?: LatLngPoint;
}

export interface RouteTransitDetails {
  lineName?: string;
  shortName?: string;
  vehicleType?: "BUS" | "SUBWAY" | "TRAIN" | "TRAM" | "HEAVY_RAIL" | "OTHER";
  stopCount?: number;
  departureStop?: RouteTransitStop;
  arrivalStop?: RouteTransitStop;
  headsign?: string;
}

export interface RouteStep {
  instruction?: string;
  distanceMeters: number;
  staticDurationSeconds: number;
  travelMode: RouteTravelMode | string;
  transitDetails?: RouteTransitDetails;
}

export interface ComputedRoute {
  id: string;
  routeIndex: number;
  summary: string;
  travelMode: RouteTravelMode;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  polyline: Array<[number, number]>; // Decoded [lat, lng] array for Leaflet
  encodedPolyline: string;
  walkingDistanceMeters: number;
  walkingDurationMinutes: number;
  transitChangesCount: number;
  steps: RouteStep[];
  emissionsGramsCo2: number;
  emissionsFactorCitation: string;
  exposureProxyUghM3: number | null; // Outdoor duration * predicted PM2.5 * microenvironment factor
  warnings: string[];
}

export interface JourneyPreferences {
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
  transitRoutingPreference?: "LESS_WALKING" | "FEWER_TRANSFERS";
  allowedTransitModes?: Array<"BUS" | "SUBWAY" | "TRAIN">;
}

export interface ComputeRoutesRequest {
  origin: RouteLocation;
  destination: RouteLocation;
  departureTime?: string; // ISO 8601 string
  travelMode?: RouteTravelMode;
  preferences?: JourneyPreferences;
  predictedPm25?: number; // Ambient PM2.5 for exposure proxy
}

export interface ComputeRoutesResponse {
  isConfigured: boolean;
  isAvailable: boolean;
  status:
    | "success"
    | "unconfigured"
    | "no_routes_found"
    | "error"
    | "rate_limited"
    | "unsupported_mode";
  routes: ComputedRoute[];
  selectedMode: RouteTravelMode;
  origin: RouteLocation;
  destination: RouteLocation;
  provider: "OpenRouteService via HeiGIT" | "Fallback Estimator" | string;
  message?: string;
  cachedAt?: string;
  uncertaintyNotes: string[];
}

export const SAMPLE_INDIAN_JOURNEYS: Array<{
  label: string;
  city: string;
  origin: RouteLocation;
  destination: RouteLocation;
}> = [
  {
    label: "Delhi: Connaught Place to Noida Sector 62",
    city: "Delhi NCR",
    origin: {
      name: "Connaught Place, New Delhi",
      latitude: 28.6315,
      longitude: 77.2167,
    },
    destination: {
      name: "Sector 62, Noida",
      latitude: 28.628,
      longitude: 77.3649,
    },
  },
  {
    label: "Mumbai: Bandra West to Nariman Point",
    city: "Mumbai",
    origin: {
      name: "Bandra West, Mumbai",
      latitude: 19.0596,
      longitude: 72.8295,
    },
    destination: {
      name: "Nariman Point, Mumbai",
      latitude: 18.9256,
      longitude: 72.8242,
    },
  },
  {
    label: "Bengaluru: Indiranagar to Electronic City",
    city: "Bengaluru",
    origin: {
      name: "Indiranagar, Bengaluru",
      latitude: 12.9784,
      longitude: 77.6408,
    },
    destination: {
      name: "Electronic City, Bengaluru",
      latitude: 12.8399,
      longitude: 77.677,
    },
  },
  {
    label: "Kolkata: Salt Lake to Park Street",
    city: "Kolkata",
    origin: {
      name: "Salt Lake Sector V, Kolkata",
      latitude: 22.5804,
      longitude: 88.4378,
    },
    destination: {
      name: "Park Street, Kolkata",
      latitude: 22.5516,
      longitude: 88.3524,
    },
  },
  {
    label: "Guwahati: Paltan Bazaar to IIT Guwahati",
    city: "Guwahati",
    origin: {
      name: "Paltan Bazaar, Guwahati",
      latitude: 26.1806,
      longitude: 91.7539,
    },
    destination: {
      name: "IIT Guwahati Campus",
      latitude: 26.1878,
      longitude: 91.6916,
    },
  },
];
