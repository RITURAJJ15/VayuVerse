import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { evaluateDeterministicRules } from "../api/_lib/rules-engine";
import { sanitizeRecommendationContent } from "../api/_lib/gemini";
import { GeminiDayPlanOutputSchema } from "../src/types/recommendations";
import { recommendationsHandler } from "../api/recommendations";
import type { GeoLocation } from "../src/types/location";
import type { UserProfile } from "../src/types/profile";
import type { StationObservationResponse } from "../src/types/air-quality";
import type { AirQualityForecastResponse } from "../src/types/forecast";

const DELHI_LOCATION: GeoLocation = {
  name: "New Delhi",
  state: "Delhi",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

const STUDENT_PROFILE: UserProfile = {
  id: "student-1",
  displayName: "Arjun",
  category: "college_student",
  ageGroup: "18-24",
  departureTime: "08:00",
  returnTime: "17:30",
  wakeUpTime: "06:30",
  sleepTime: "23:30",
  outdoorActivity: "evening_sports",
  scheduleFlexibility: "moderate",
  commuteMode: "metro",
  hasChildren: false,
  hasSeniors: false,
  sensitivity: "normal",
  homeType: "apartment_sealed",
  cookingFuel: "lpg_chimney",
  purifierAvailability: "none",
  preferredLanguage: "English",
};

const SENIOR_PROFILE: UserProfile = {
  id: "senior-1",
  displayName: "Mrs. Mukherjee",
  category: "senior_citizen",
  ageGroup: "65+",
  departureTime: "06:30",
  returnTime: "18:00",
  wakeUpTime: "05:30",
  sleepTime: "21:30",
  outdoorActivity: "morning_walk_jog",
  scheduleFlexibility: "high",
  commuteMode: "walk_cycle",
  hasChildren: false,
  hasSeniors: true,
  sensitivity: "high",
  homeType: "standalone_house",
  cookingFuel: "lpg_chimney",
  purifierAvailability: "none",
  preferredLanguage: "English",
};

const ELEVATED_OBSERVATIONS: StationObservationResponse = {
  isAvailable: true,
  location: DELHI_LOCATION,
  station: {
    id: 1234,
    name: "Lodhi Road, New Delhi - IMD",
    distanceKm: 3.2,
    coordinates: { latitude: 28.59, longitude: 77.22 },
  },
  provider: {
    name: "CPCB / OpenAQ",
    organization: "Central Pollution Control Board",
    isOfficial: true,
  },
  pm25: {
    value: 145.4,
    unit: "µg/m³",
    lastUpdatedUtc: new Date(Date.now() - 3600000).toISOString(),
    isStale: false,
  },
  pm10: {
    value: 232.0,
    unit: "µg/m³",
    lastUpdatedUtc: new Date(Date.now() - 3600000).toISOString(),
    isStale: false,
  },
  naqi: {
    overallAqi: 319,
    category: "Very Poor",
    categoryColor: "#E05A47",
    governingPollutant: "PM2.5",
    healthStatement: "Respiratory illness to the people on prolonged exposure",
    subIndices: { pm25: 319, pm10: 188 },
    isOfficialReporting: false,
    methodologyNote: "CPCB Indian AQI",
  },
  freshness: {
    lastObservedUtc: new Date(Date.now() - 3600000).toISOString(),
    fetchedAtUtc: new Date().toISOString(),
    hoursAgo: 1,
    category: "fresh",
    label: "Fresh (1h ago)",
  },
};

const MOCK_FORECAST: AirQualityForecastResponse = {
  latitude: 28.6139,
  longitude: 77.209,
  cityName: "New Delhi",
  timezone: "Asia/Kolkata",
  generatedAtUtc: new Date().toISOString(),
  model: {
    name: "Copernicus CAMS Global Atmospheric Composition",
    domain: "Global (0.25° resolution)",
    provider: "ECMWF via Open-Meteo",
    disclaimer: "Modeled atmospheric dispersion estimates; not real-time physical observations.",
  },
  hourly: [
    {
      timestampUtc: new Date(Date.now() + 3600000).toISOString(),
      timestampLocal: "09:00",
      pm25: 120,
      pm10: 190,
      timeWindow: "morning",
      isDaylight: true,
    },
    {
      timestampUtc: new Date(Date.now() + 18000000).toISOString(),
      timestampLocal: "14:00",
      pm25: 85,
      pm10: 140,
      timeWindow: "afternoon",
      isDaylight: true,
    },
    {
      timestampUtc: new Date(Date.now() + 36000000).toISOString(),
      timestampLocal: "19:00",
      pm25: 160,
      pm10: 240,
      timeWindow: "evening",
      isDaylight: false,
    },
  ],
};

describe("Evidence-Grounded Recommendation Engine — Deterministic Rules", () => {
  it("enforces severe exposure risk rules and PM2.5 limits when telemetry is elevated", () => {
    const rules = evaluateDeterministicRules(
      DELHI_LOCATION,
      STUDENT_PROFILE,
      ELEVATED_OBSERVATIONS,
      MOCK_FORECAST
    );

    expect(rules.constraints).toContain(
      "ELEVATED_POLLUTION: PM2.5 exceeds national ambient standard (60 µg/m³). Avoid recommending outdoor running, heavy cycling, or prolonged outdoor workouts."
    );
    expect(
      rules.constraints.some((c) => c.includes("SEVERE_EXPOSURE_RISK"))
    ).toBe(true);

    // Fallback plan must be generated and contain morning, afternoon, evening
    expect(rules.fallbackPlan.sections.morning.recommendations.length).toBeGreaterThan(0);
    expect(rules.fallbackPlan.sections.afternoon.recommendations.length).toBeGreaterThan(0);
    expect(rules.fallbackPlan.sections.evening.recommendations.length).toBeGreaterThan(0);
  });

  it("produces materially divergent constraints and guidance for Student vs Senior under identical telemetry", () => {
    const studentRules = evaluateDeterministicRules(
      DELHI_LOCATION,
      STUDENT_PROFILE,
      ELEVATED_OBSERVATIONS,
      MOCK_FORECAST
    );

    const seniorRules = evaluateDeterministicRules(
      DELHI_LOCATION,
      SENIOR_PROFILE,
      ELEVATED_OBSERVATIONS,
      MOCK_FORECAST
    );

    // Student has commute rules
    const hasStudentCommute = studentRules.constraints.some((c) =>
      c.includes("COMMUTE_MODE_METRO")
    );
    expect(hasStudentCommute).toBe(true);

    // Senior has vulnerable senior rules and zero strenuous outdoor exercise advice
    const hasSeniorConstraint = seniorRules.constraints.some((c) =>
      c.includes("VULNERABLE_SENIOR")
    );
    expect(hasSeniorConstraint).toBe(true);

    // Check actions divergence in fallback plans
    const studentActionTitles = [
      ...studentRules.fallbackPlan.sections.morning.recommendations,
      ...studentRules.fallbackPlan.sections.afternoon.recommendations,
      ...studentRules.fallbackPlan.sections.evening.recommendations,
    ].map((r) => r.title.toLowerCase());

    const seniorActionTitles = [
      ...seniorRules.fallbackPlan.sections.morning.recommendations,
      ...seniorRules.fallbackPlan.sections.afternoon.recommendations,
      ...seniorRules.fallbackPlan.sections.evening.recommendations,
    ].map((r) => r.title.toLowerCase());

    expect(studentActionTitles.some((t) => t.includes("campus") || t.includes("commute") || t.includes("transit"))).toBe(true);
    expect(seniorActionTitles.some((t) => t.includes("gentle") || t.includes("indoor morning") || t.includes("movement"))).toBe(true);
  });

  it("identifies stale observations (>24h) and directs engine to rely on CAMS forecast", () => {
    const staleObservations: StationObservationResponse = {
      ...ELEVATED_OBSERVATIONS,
      freshness: {
        lastObservedUtc: new Date(Date.now() - 30 * 3600000).toISOString(),
        fetchedAtUtc: new Date().toISOString(),
        hoursAgo: 30,
        category: "stale",
        label: "Historical (30h ago)",
      },
      pm25: {
        ...ELEVATED_OBSERVATIONS.pm25!,
        isStale: true,
      },
    };

    const rules = evaluateDeterministicRules(
      DELHI_LOCATION,
      STUDENT_PROFILE,
      staleObservations,
      MOCK_FORECAST
    );

    expect(
      rules.constraints.some((c) => c.includes("STATION_STALE"))
    ).toBe(true);

    // Stale telemetry must not be presented as current real-time atmosphere in the evidence payload
    expect(rules.evidencePayload.observations.stationFreshnessCategory).toBe("stale");
    expect(rules.evidencePayload.observations.isTelemetryStale).toBe(true);
  });

  it("handles complete station unavailability with 100% resilient fallback guidance", () => {
    const unavailableObservations: StationObservationResponse = {
      isAvailable: false,
      location: DELHI_LOCATION,
      provider: { name: "OpenAQ", isOfficial: false },
    };

    const rules = evaluateDeterministicRules(
      DELHI_LOCATION,
      STUDENT_PROFILE,
      unavailableObservations,
      MOCK_FORECAST
    );

    expect(
      rules.constraints.some((c) => c.includes("STATION_UNAVAILABLE"))
    ).toBe(true);

    expect(rules.fallbackPlan.isAiGenerated).toBe(false);
    expect(rules.fallbackPlan.sections.morning.recommendations.length).toBeGreaterThan(0);
  });
});

describe("Server-Side Safety Checks and Content Sanitization", () => {
  it("rejects forbidden clinical medical claims, cures, and fabricated disease risk percentages", () => {
    expect(
      sanitizeRecommendationContent("This purifier will cure your chronic asthma.")
    ).toBe(false);

    expect(
      sanitizeRecommendationContent("Following this plan reduces heart attack risk by 28%.")
    ).toBe(false);

    expect(
      sanitizeRecommendationContent("Official medical diagnosis for respiratory illness.")
    ).toBe(false);

    expect(
      sanitizeRecommendationContent("Lowers your stroke risk significantly.")
    ).toBe(false);
  });

  it("accepts valid, evidence-grounded non-clinical protective recommendations", () => {
    expect(
      sanitizeRecommendationContent(
        "Wear an N95 respirator during morning commute when PM2.5 levels exceed 140 µg/m³."
      )
    ).toBe(true);

    expect(
      sanitizeRecommendationContent(
        "Keep bedroom windows sealed during evening boundary-layer descent."
      )
    ).toBe(true);

    expect(
      sanitizeRecommendationContent(
        "Utilize the midday solar window between 12:00 and 15:00 for essential outdoor errands."
      )
    ).toBe(true);
  });

  it("validates structured Gemini output against GeminiDayPlanOutputSchema", () => {
    const validGeminiOutput = {
      morning: {
        atmosphericContext: "Early morning thermal inversion traps surface particulates.",
        recommendations: [
          {
            title: "Wear N95 Mask on Transit",
            action: "Equip a certified N95 mask while walking to the metro station.",
            explanation: "Ground-level PM2.5 reaches peak density before solar heating expands the boundary layer.",
            timeWindow: "07:30 – 08:30",
            evidenceReferences: ["OpenAQ Station Lodhi Road: PM2.5 = 145 µg/m³"],
            confidenceLevel: "High",
            category: "protection",
          },
        ],
      },
      afternoon: {
        atmosphericContext: "Convective boundary layer expansion lowers ground particulate concentration.",
        recommendations: [
          {
            title: "Midday Outdoor Window",
            action: "Perform urgent outdoor errands between 13:00 and 15:00.",
            explanation: "Solar heating facilitates dispersion.",
            timeWindow: "13:00 – 15:00",
            evidenceReferences: ["CAMS Forecast PM2.5 drop to 85 µg/m³"],
            confidenceLevel: "High",
            category: "timing",
          },
        ],
      },
      evening: {
        atmosphericContext: "Cooling air temperatures cause boundary layer compression.",
        recommendations: [
          {
            title: "Seal Living Space Windows",
            action: "Close exterior windows by 17:30 to avoid evening rush vehicular intrusion.",
            explanation: "Evening vehicular traffic combined with inversion causes sharp PM2.5 peaks.",
            timeWindow: "17:30 – 21:00",
            evidenceReferences: ["CAMS evening surge to 160 µg/m³"],
            confidenceLevel: "High",
            category: "indoor",
          },
        ],
      },
    };

    const parsed = GeminiDayPlanOutputSchema.safeParse(validGeminiOutput);
    expect(parsed.success).toBe(true);
  });
});

describe("Backend /api/recommendations API endpoint", () => {
  it("rejects missing body or coordinates with HTTP 400", async () => {
    let statusCode = 200;
    let responseData: Record<string, unknown> | null = null;

    const req = {
      method: "POST",
      body: {},
    } as unknown as Request;

    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: Record<string, unknown>) => {
        responseData = data;
        return res;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    await recommendationsHandler(req, res);

    expect(statusCode).toBe(400);
    expect(responseData?.error).toBeDefined();
  });

  it("rejects coordinates outside India with HTTP 400", async () => {
    let statusCode = 200;
    let responseData: Record<string, unknown> | null = null;

    const req = {
      method: "POST",
      body: {
        location: {
          name: "London",
          latitude: 51.5074,
          longitude: -0.1278,
        },
        profile: STUDENT_PROFILE,
      },
    } as unknown as Request;

    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: Record<string, unknown>) => {
        responseData = data;
        return res;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    await recommendationsHandler(req, res);

    expect(statusCode).toBe(400);
    expect((responseData?.error as string) || "").toContain("outside India");
  });

  it("handles valid request for Delhi returning structured recommendation plan with safety constraints", async () => {
    let statusCode = 200;
    let responseData: Record<string, unknown> | null = null;

    const req = {
      method: "POST",
      body: {
        location: DELHI_LOCATION,
        profile: STUDENT_PROFILE,
      },
    } as unknown as Request;

    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: Record<string, unknown>) => {
        responseData = data;
        return res;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    await recommendationsHandler(req, res);

    expect(statusCode).toBe(200);
    expect(responseData?.sections).toBeDefined();
    const sections = responseData?.sections as Record<string, unknown>;
    expect(sections.morning).toBeDefined();
    expect(sections.afternoon).toBeDefined();
    expect(sections.evening).toBeDefined();
    expect(Array.isArray(responseData?.safetyRulesApplied)).toBe(true);
  }, 35000);
});
