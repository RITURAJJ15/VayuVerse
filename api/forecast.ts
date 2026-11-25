import type { Request, Response } from "express";
import { airQualityQuerySchema } from "./_lib/validation";
import { getOpenMeteoForecast } from "./_lib/forecast";
import { ApiHandlerError, withErrorHandler } from "./_lib/errors";

export const forecastHandler = withErrorHandler(async (req: Request, res: Response) => {
  const parsed = airQualityQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid forecast query parameters";
    throw new ApiHandlerError(400, issue, parsed.error.flatten());
  }

  const { latitude, longitude, city } = parsed.data;

  // Retrieve normalized atmospheric dispersion forecast from Open-Meteo CAMS Global
  const forecastData = await getOpenMeteoForecast(latitude, longitude, city);

  // Cache forecast for 30 minutes at CDN edge, stale-while-revalidate for 5 minutes
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=300");
  res.json(forecastData);
});

export default async function handler(req: Request, res: Response) {
  return forecastHandler(req, res);
}
