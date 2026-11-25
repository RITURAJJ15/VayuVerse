/**
 * Typed API client for /api/* routes.
 * All external data fetches go through the backend;
 * this module provides the browser-side fetch wrapper.
 */

import type { LocationSearchResult, GeoLocation } from "@/types/location";
import type { StationObservationResponse } from "@/types/air-quality";
import type { AirQualityForecastResponse } from "@/types/forecast";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      // non-JSON error body — ignore
    }
    throw new ApiError(
      res.status,
      `API request failed: ${res.status} ${res.statusText}`,
      details
    );
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /**
   * Search for cities, towns, and localities across India
   */
  searchLocations: async (query: string, count = 10): Promise<GeoLocation[]> => {
    if (!query || query.trim().length < 2) return [];
    const encoded = encodeURIComponent(query.trim());
    const res = await request<LocationSearchResult>(
      `/api/locations?query=${encoded}&count=${count}`
    );
    return res.results;
  },

  /**
   * Reverse geocode browser coordinates to Indian locality
   */
  reverseGeocode: async (latitude: number, longitude: number): Promise<GeoLocation> => {
    const res = await request<LocationSearchResult>(
      `/api/locations?latitude=${latitude}&longitude=${longitude}`
    );
    if (!res.results || res.results.length === 0) {
      throw new ApiError(404, "Could not resolve location name for these coordinates");
    }
    return res.results[0]!;
  },

  /**
   * Fetch verified OpenAQ monitoring-station observations
   */
  getAirQuality: async (
    latitude: number,
    longitude: number,
    city?: string
  ): Promise<StationObservationResponse> => {
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
    return request<StationObservationResponse>(
      `/api/air-quality?latitude=${latitude}&longitude=${longitude}${cityParam}`
    );
  },

  /**
   * Fetch modeled atmospheric dispersion forecast from Open-Meteo CAMS Global
   */
  getForecast: async (
    latitude: number,
    longitude: number,
    city?: string
  ): Promise<AirQualityForecastResponse> => {
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
    return request<AirQualityForecastResponse>(
      `/api/forecast?latitude=${latitude}&longitude=${longitude}${cityParam}`
    );
  },
};
