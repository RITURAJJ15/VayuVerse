import type { Request, Response } from "express";
import { computeOpenRouteServiceRoutes } from "./_lib/openrouteservice.js";
import type { ComputeRoutesRequest } from "../src/types/routes";

export async function routesHandler(req: Request, res: Response) {
  // Set JSON content type
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST for route computation.",
    });
  }

  const {
    origin,
    destination,
    travelMode = "DRIVE",
    preferences,
    departureTime,
    predictedPm25,
  } = (req.body || {}) as Partial<ComputeRoutesRequest>;

  // Validation
  if (!origin || typeof origin.latitude !== "number" || typeof origin.longitude !== "number") {
    return res.status(400).json({
      error: "Invalid origin location: latitude and longitude are required numbers.",
    });
  }

  if (!destination || typeof destination.latitude !== "number" || typeof destination.longitude !== "number") {
    return res.status(400).json({
      error: "Invalid destination location: latitude and longitude are required numbers.",
    });
  }

  try {
    const result = await computeOpenRouteServiceRoutes({
      origin: {
        name: origin.name || "Origin",
        latitude: origin.latitude,
        longitude: origin.longitude,
        address: origin.address,
      },
      destination: {
        name: destination.name || "Destination",
        latitude: destination.latitude,
        longitude: destination.longitude,
        address: destination.address,
      },
      travelMode,
      preferences,
      departureTime,
      predictedPm25,
    });

    return res.status(200).json(result);
  } catch (err) {
    const message = (err as Error).message || "Internal server error during route calculation.";
    return res.status(400).json({
      error: message,
    });
  }
}
