/** Core air-quality data types shared across frontend components */

export interface OpenAQPollutant {
  parameter: string;         // e.g. "pm25", "pm10", "no2", "so2", "co", "o3"
  displayName: string;       // e.g. "PM2.5", "PM10", "NO₂"
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

/** A single pollutant measurement with full provenance */
export interface PollutantMeasurement {
  parameter: string;
  displayName: string;
  value: number;
  unit: string;
  timestamp: string;
  source: "openaq" | "open-meteo-model" | "cpcb";
  stationId?: string;
  stationName?: string;
  coordinates?: { latitude: number; longitude: number };
}

/** Forecast data point */
export interface ForecastPoint {
  timestamp: string;
  parameter: string;
  value: number;
  unit: string;
}

export interface ForecastData {
  locationName: string;
  coordinates: { latitude: number; longitude: number };
  hourly: ForecastPoint[];
  source: "open-meteo-model";
}
