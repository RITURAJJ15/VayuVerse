/** Application-wide constants */

/** Indian National Air Quality Index breakpoints */
export const NAQI_CATEGORIES = [
  { label: "Good", range: [0, 50] as const, color: "#22c55e" },
  { label: "Satisfactory", range: [51, 100] as const, color: "#84cc16" },
  { label: "Moderate", range: [101, 200] as const, color: "#eab308" },
  { label: "Poor", range: [201, 300] as const, color: "#f97316" },
  { label: "Very Poor", range: [301, 400] as const, color: "#ef4444" },
  { label: "Severe", range: [401, 500] as const, color: "#7f1d1d" },
] as const;

/** Stale times for TanStack Query */
export const STALE_TIMES = {
  AIR_QUALITY: 5 * 60 * 1000, // 5 minutes
  FORECAST: 30 * 60 * 1000,   // 30 minutes
  LOCATIONS: 60 * 60 * 1000,  // 1 hour (geocoding results are stable)
} as const;

/** Default center for India */
export const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 } as const;

export const APP_NAME = "VayuVerse" as const;
export const APP_TAGLINE = "Your Personal AI Clean-Air Navigator" as const;
