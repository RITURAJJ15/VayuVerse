import type { Request, Response } from "express";
import { airQualityQuerySchema } from "./_lib/validation.js";
import { getOpenAQObservations } from "./_lib/openaq.js";
import { ApiHandlerError, withErrorHandler } from "./_lib/errors.js";

export const airQualityHandler = withErrorHandler(async (req: Request, res: Response) => {
  const parsed = airQualityQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid air quality query parameters";
    throw new ApiHandlerError(400, issue, parsed.error.flatten());
  }

  const { latitude, longitude, city } = parsed.data;

  // Retrieve actual ground-station observations from OpenAQ v3
  const observationData = await getOpenAQObservations(latitude, longitude, city);

  // Set 5-minute CDN edge cache header
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.json(observationData);
});

// Default export for Vercel Serverless Function
export default async function handler(req: Request, res: Response) {
  return airQualityHandler(req, res);
}
