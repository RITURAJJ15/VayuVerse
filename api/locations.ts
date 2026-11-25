import type { Request, Response } from "express";
import { locationSearchQuerySchema } from "./_lib/validation.js";
import { searchIndianLocations, reverseGeocodeCoordinates } from "./_lib/open-meteo.js";
import { ApiHandlerError, withErrorHandler } from "./_lib/errors.js";

export const locationsHandler = withErrorHandler(async (req: Request, res: Response) => {
  // Normalize ?q= and ?query= for client compatibility
  const normalizedQuery = {
    ...req.query,
    query: req.query.query || req.query.q,
  };

  // Validate query parameters using Zod
  const parsed = locationSearchQuerySchema.safeParse(normalizedQuery);

  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid location search parameters";
    throw new ApiHandlerError(400, issue, parsed.error.flatten());
  }

  const { query, latitude, longitude, count } = parsed.data;

  // Case 1: Reverse geocoding via browser coordinates
  if (latitude !== undefined && longitude !== undefined) {
    const location = await reverseGeocodeCoordinates(latitude, longitude);
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.json({
      results: [location],
      total: 1,
    });
    return;
  }

  // Case 2: Text search across India
  if (!query || query.trim().length < 2) {
    res.json({
      results: [],
      query: query || "",
      total: 0,
    });
    return;
  }

  const results = await searchIndianLocations(query, count);

  // Set caching header: 1 hour cache on CDN/Vercel edge for geocoding
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.json({
    results,
    query,
    total: results.length,
  });
});

// Default export for Vercel Serverless Function
export default async function handler(req: Request, res: Response) {
  return locationsHandler(req, res);
}
