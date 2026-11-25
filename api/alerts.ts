import type { Request, Response } from "express";
import { z } from "zod";
import { ApiHandlerError, withErrorHandler } from "./_lib/errors";
import { getOpenAQObservations } from "./_lib/openaq";
import { getOpenMeteoForecast } from "./_lib/forecast";
import { evaluateAirQualityAlerts } from "../src/lib/alert-engine";
import type { GeoLocation } from "../src/types/location";
import type { UserProfile } from "../src/types/profile";
import type { AirAlert, NotificationPreferences } from "../src/types/alerts";

const alertEvaluationSchema = z.object({
  location: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    state: z.string().default("IN"),
    country: z.string().default("India"),
    latitude: z.number().min(6.5).max(37.5),
    longitude: z.number().min(68.0).max(97.5),
    timezone: z.string().default("Asia/Kolkata"),
  }),
  profile: z.object({
    id: z.string().default("default"),
    displayName: z.string().default("User"),
    category: z.enum([
      "college_student",
      "office_commuter",
      "parent_child",
      "senior_citizen",
      "general_individual",
      "family_household",
    ]).default("general_individual"),
    ageGroup: z.string().default("25-34"),
    sensitivity: z.enum(["normal", "moderate", "high"]).default("normal"),
    commuteMode: z.string().default("metro"),
    departureTime: z.string().default("08:30"),
    returnTime: z.string().default("17:30"),
    wakeUpTime: z.string().default("06:30"),
    sleepTime: z.string().default("23:00"),
    outdoorActivity: z.string().default("none"),
    scheduleFlexibility: z.string().default("moderate"),
    hasChildren: z.boolean().default(false),
    hasSeniors: z.boolean().default(false),
    homeType: z.string().default("ventilated_flat"),
    cookingFuel: z.string().default("lpg_chimney"),
    purifierAvailability: z.string().default("none"),
    preferredLanguage: z.string().default("English"),
  }),
  preferences: z.object({
    user_id: z.string().default("guest"),
    enabled: z.boolean().default(true),
    browser_notifications_enabled: z.boolean().default(false),
    minimum_severity: z.enum(["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]).default("Moderate"),
    quiet_hours_start: z.string().default("22:00"),
    quiet_hours_end: z.string().default("07:00"),
    timezone: z.string().default("Asia/Kolkata"),
  }).optional(),
  previousAlerts: z.array(z.any()).default([]),
});

export const alertsHandler = withErrorHandler(async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    throw new ApiHandlerError(405, "Method not allowed. Use POST.");
  }

  const parsed = alertEvaluationSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid alert evaluation payload";
    throw new ApiHandlerError(400, issue, parsed.error.flatten());
  }

  const { location, profile, preferences, previousAlerts } = parsed.data;

  // Retrieve environmental telemetry in parallel with resilient error boundary
  const [obsResult, forecastResult] = await Promise.allSettled([
    getOpenAQObservations(location.latitude, location.longitude, location.name),
    getOpenMeteoForecast(location.latitude, location.longitude, location.name),
  ]);

  const observations = obsResult.status === "fulfilled" ? obsResult.value : undefined;
  const forecast = forecastResult.status === "fulfilled" ? forecastResult.value : undefined;

  // Run deterministic alert engine
  const context = evaluateAirQualityAlerts(
    location as GeoLocation,
    profile as UserProfile,
    observations,
    forecast,
    previousAlerts as AirAlert[],
    preferences as NotificationPreferences
  );

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(context);
});

export default async function handler(req: Request, res: Response) {
  return alertsHandler(req, res);
}
