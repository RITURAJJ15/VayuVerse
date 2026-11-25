/**
 * Atmospheric dispersion forecast types normalized from Open-Meteo CAMS Global API.
 * Modeled projections are strictly distinguished from ground station observations.
 */

export type DiurnalTimeWindow = "Morning" | "Afternoon" | "Evening" | "Night";

export type DispersionStatus = "Stagnant" | "Moderate" | "Ventilated";

export interface HourlyForecastPoint {
  timeIso: string;          // e.g. "2026-11-21T06:00"
  timeFormatted: string;    // e.g. "06:00 AM"
  dateFormatted: string;    // e.g. "21 Nov"
  dateKey: string;          // e.g. "2026-11-21"
  dayLabel: string;         // "Today", "Tomorrow", or date
  hour: number;             // 0-23
  timeWindow: DiurnalTimeWindow;
  pm25: number | null;      // Strictly preserved as null if unavailable; NEVER 0
  pm10: number | null;      // Strictly preserved as null if unavailable; NEVER 0
  ozone: number | null;
  no2: number | null;
  dust: number | null;
  co: number | null;
  europeanAqi: number | null;
  dispersionCategory: DispersionStatus;
}

export interface DiurnalWindowSummary {
  window: DiurnalTimeWindow;
  timeRange: string;        // e.g. "06:00 AM - 12:00 PM"
  avgPm25: number | null;
  avgPm10: number | null;
  dispersion: DispersionStatus;
  description: string;
}

export interface DayForecastSummary {
  dateKey: string;          // "2026-11-21"
  dayLabel: string;         // "Today", "Tomorrow", "Sunday"
  dateFormatted: string;    // "21 Nov 2026"
  avgPm25: number | null;
  peakPm25: number | null;
  minPm25: number | null;
  peakHourFormatted: string | null;
  cleanestHourFormatted: string | null;
  cleanestWindow: string;   // e.g. "Afternoon (02:00 PM - 05:00 PM)"
  windows: DiurnalWindowSummary[];
  hourly: HourlyForecastPoint[];
}

export interface AirQualityForecastResponse {
  isAvailable: boolean;
  unavailableReason?: string;
  source: {
    provider: string;           // "Open-Meteo"
    model: string;              // "Copernicus Atmosphere Monitoring Service (CAMS Global)"
    domain: string;             // "cams_global"
    spatialResolution: string;  // "~40 km (0.4° global grid)"
    generationTimeMs: number;
    forecastIssuedUtc: string;
    isModeled: true;            // Static guard ensuring modeled status
  };
  coordinates: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  timezone: string;
  utcOffsetSeconds: number;
  units: {
    pm25: string;
    pm10: string;
    ozone: string;
    no2: string;
    dust: string;
    co: string;
  };
  days: DayForecastSummary[];
  allHourly: HourlyForecastPoint[];
  retrievedAtUtc: string;
}
