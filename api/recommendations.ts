import type { Request, Response } from "express";
import { z } from "zod";
import { ApiHandlerError, withErrorHandler } from "./_lib/errors";
import { getOpenAQObservations } from "./_lib/openaq";
import { getOpenMeteoForecast } from "./_lib/forecast";
import { evaluateDeterministicRules } from "./_lib/rules-engine";
import { generateGeminiDayPlan } from "./_lib/gemini";
import type { StationObservationResponse } from "../src/types/air-quality";
import type { AirQualityForecastResponse } from "../src/types/forecast";
import type { UserProfile } from "../src/types/profile";
import type { GeoLocation } from "../src/types/location";

const recommendationRequestSchema = z.object({
  location: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    state: z.string().default("IN"),
    country: z.string().default("India"),
    latitude: z
      .number()
      .min(6.5, "Coordinates outside India (latitude must be between 6.5 and 37.5°N)")
      .max(37.5, "Coordinates outside India (latitude must be between 6.5 and 37.5°N)"),
    longitude: z
      .number()
      .min(68.0, "Coordinates outside India (longitude must be between 68.0 and 97.5°E)")
      .max(97.5, "Coordinates outside India (longitude must be between 68.0 and 97.5°E)"),
    timezone: z.string().default("Asia/Kolkata"),
  }),
  profile: z.object({
    id: z.string().default("default"),
    displayName: z.string().default("User"),
    category: z
      .enum([
        "college_student",
        "office_commuter",
        "parent_child",
        "senior_citizen",
        "general_individual",
        "family_household",
      ])
      .default("general_individual"),
    ageGroup: z.enum(["18-24", "25-34", "35-50", "51-64", "65+"]).default("25-34"),
    sensitivity: z.enum(["normal", "moderate", "high"]).default("normal"),
    commuteMode: z
      .enum(["metro", "two_wheeler", "bus", "cab_car", "walk_cycle", "minimal"])
      .default("metro"),
    departureTime: z.string().default("08:30"),
    returnTime: z.string().default("17:30"),
    wakeUpTime: z.string().default("06:30"),
    sleepTime: z.string().default("23:00"),
    outdoorActivity: z
      .enum([
        "morning_walk_jog",
        "evening_sports",
        "market_errands",
        "school_drop_pickup",
        "none",
      ])
      .default("market_errands"),
    scheduleFlexibility: z.enum(["high", "moderate", "low"]).default("moderate"),
    hasChildren: z.boolean().default(false),
    hasSeniors: z.boolean().default(false),
    homeType: z
      .enum([
        "apartment_sealed",
        "ventilated_flat",
        "standalone_house",
        "independent_floor",
      ])
      .default("ventilated_flat"),
    cookingFuel: z
      .enum([
        "lpg_chimney",
        "lpg_no_chimney",
        "electric_induction",
        "biomass_chulha",
      ])
      .default("lpg_chimney"),
    purifierAvailability: z
      .enum(["none", "bedroom_hepa", "multi_room_hepa", "diy_exhaust"])
      .default("none"),
    preferredLanguage: z
      .enum(["English", "Hindi", "Bengali", "Assamese", "Marathi"])
      .default("English"),
  }),
  model: z.string().optional(),
});

export const recommendationsHandler = withErrorHandler(
  async (req: Request, res: Response) => {
    if (req.method !== "POST") {
      throw new ApiHandlerError(405, "Method not allowed. Use POST.");
    }

    const parsed = recommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Invalid recommendation request payload";
      throw new ApiHandlerError(400, issue, parsed.error.flatten());
    }

    const { location, profile, model } = parsed.data;

    // 1. Retrieve environmental telemetry in parallel with resilient error boundary
    const [obsResult, forecastResult] = await Promise.allSettled([
      getOpenAQObservations(location.latitude, location.longitude, location.name),
      getOpenMeteoForecast(location.latitude, location.longitude, location.name),
    ]);

    const observations: StationObservationResponse | undefined =
      obsResult.status === "fulfilled" ? obsResult.value : undefined;

    const forecast: AirQualityForecastResponse | undefined =
      forecastResult.status === "fulfilled" ? forecastResult.value : undefined;

    // 2. Run deterministic environmental safety and recommendation rules
    const rulesResult = evaluateDeterministicRules(
      location as GeoLocation,
      profile as UserProfile,
      observations,
      forecast
    );

    // 3. Invoke evidence-grounded Gemini engine (with automatic fallback to deterministic plan)
    const dayPlan = await generateGeminiDayPlan(rulesResult, model);

    res.json(dayPlan);
  }
);

// Default export for Vercel Serverless Function
export default async function handler(req: Request, res: Response) {
  return recommendationsHandler(req, res);
}
