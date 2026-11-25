/**
 * Shared Zod validation schemas for API request/response validation.
 * Used by both server-side handlers and the frontend.
 */

import { z } from "zod";

/** Coordinates within India's approximate bounding box */
export const coordinatesSchema = z.object({
  latitude: z.number().min(6).max(38),
  longitude: z.number().min(68).max(98),
});

/** Air quality query params */
export const airQualityQuerySchema = z.object({
  latitude: z.coerce
    .number()
    .min(6, "Coordinates outside India (latitude must be between 6°N and 38°N)")
    .max(38, "Coordinates outside India (latitude must be between 6°N and 38°N)"),
  longitude: z.coerce
    .number()
    .min(68, "Coordinates outside India (longitude must be between 68°E and 98°E)")
    .max(98, "Coordinates outside India (longitude must be between 68°E and 98°E)"),
  city: z.string().optional(),
});

/** Location search query params */
export const locationSearchQuerySchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters").max(100).optional(),
  latitude: z.coerce
    .number()
    .min(6, "Coordinates fall outside India (latitude must be between 6°N and 38°N)")
    .max(38, "Coordinates fall outside India (latitude must be between 6°N and 38°N)")
    .optional(),
  longitude: z.coerce
    .number()
    .min(68, "Coordinates fall outside India (longitude must be between 68°E and 98°E)")
    .max(98, "Coordinates fall outside India (longitude must be between 68°E and 98°E)")
    .optional(),
  count: z.coerce.number().int().min(1).max(20).optional().default(8),
}).refine(
  (data) => data.query !== undefined || (data.latitude !== undefined && data.longitude !== undefined),
  { message: "Either 'query' or both 'latitude' and 'longitude' must be provided." }
);

/** Single geocoded location schema */
export const geocodedLocationSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  state: z.string(),
  district: z.string().optional(),
  country: z.string(),
  countryCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  population: z.number().optional(),
});

/** Location search endpoint response */
export const locationSearchResponseSchema = z.object({
  results: z.array(geocodedLocationSchema),
  query: z.string().optional(),
  total: z.number(),
});

/** Shared pollutant measurement */
export const pollutantMeasurementSchema = z.object({
  parameter: z.string(),
  displayName: z.string(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string(),
  source: z.enum(["openaq", "open-meteo-model", "cpcb"]),
  stationId: z.string().optional(),
  stationName: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
});

/** Air quality response */
export const airQualityResponseSchema = z.object({
  locationName: z.string(),
  aqi: z.number().nullable(),
  aqiSource: z.enum(["naqi", "us-epa"]),
  measurements: z.array(pollutantMeasurementSchema),
  lastUpdated: z.string(),
  isModeled: z.boolean(),
});

/** Health check response */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
  configuredKeys: z.record(z.string(), z.boolean()),
});
