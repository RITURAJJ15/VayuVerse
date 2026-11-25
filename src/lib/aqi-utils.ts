/**
 * AQI calculation and display utilities.
 *
 * Implements the Indian National Air Quality Index (NAQI) breakpoint
 * math and color/label mapping. All functions are pure — no data fetching.
 */

import { NAQI_CATEGORIES } from "./constants";

export type AqiCategory = (typeof NAQI_CATEGORIES)[number];

/**
 * Returns the NAQI category for a given AQI value.
 */
export function getAqiCategory(aqi: number): AqiCategory {
  for (const cat of NAQI_CATEGORIES) {
    if (aqi >= cat.range[0] && aqi <= cat.range[1]) return cat;
  }
  // Above 500 — treat as severe
  return NAQI_CATEGORIES[NAQI_CATEGORIES.length - 1]!;
}

/**
 * Returns a human-readable health advisory for the NAQI band.
 */
export function getHealthAdvisory(aqi: number): string {
  if (aqi <= 50) return "Air quality is good. Enjoy outdoor activities.";
  if (aqi <= 100) return "Air quality is acceptable. Unusually sensitive people should limit prolonged outdoor exertion.";
  if (aqi <= 200) return "May cause discomfort to people with lung or heart disease, children, and older adults.";
  if (aqi <= 300) return "May cause discomfort to most people on prolonged exposure. Limit outdoor activity.";
  if (aqi <= 400) return "May cause respiratory illness on prolonged exposure. Avoid outdoor activities.";
  return "Serious risk of health effects. Everyone should avoid all outdoor exertion.";
}

/**
 * Calculates Indian NAQI for PM2.5 based on CPCB standard breakpoints.
 */
export function calculatePm25SubIndex(conc: number): number {
  if (conc <= 30) return Math.round((conc / 30) * 50);
  if (conc <= 60) return Math.round(50 + ((conc - 30) / 30) * 50);
  if (conc <= 90) return Math.round(100 + ((conc - 60) / 30) * 100);
  if (conc <= 120) return Math.round(200 + ((conc - 90) / 30) * 100);
  if (conc <= 250) return Math.round(300 + ((conc - 120) / 130) * 100);
  return Math.min(500, Math.round(400 + ((conc - 250) / 130) * 100));
}

/**
 * Calculates Indian NAQI for PM10 based on CPCB standard breakpoints.
 */
export function calculatePm10SubIndex(conc: number): number {
  if (conc <= 50) return Math.round(conc);
  if (conc <= 100) return Math.round(conc);
  if (conc <= 250) return Math.round(100 + ((conc - 100) / 150) * 100);
  if (conc <= 350) return Math.round(200 + ((conc - 250) / 100) * 100);
  if (conc <= 430) return Math.round(300 + ((conc - 350) / 80) * 100);
  return Math.min(500, Math.round(400 + ((conc - 430) / 70) * 100));
}

/**
 * Returns the CSS background-color for an AQI value.
 */
export function getAqiColor(aqi: number): string {
  return getAqiCategory(aqi).color;
}
