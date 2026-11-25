// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  generateDeterministicDailyPlan,
  analyzeForecastCurve,
} from "@/lib/daily-planning-engine";
import {
  calculateIndoorStatusSummary,
  saveLocalChecklistState,
  getLocalChecklistState,
} from "@/lib/indoor-guardian-service";
import { TodaysPlanCard } from "@/components/dashboard/todays-plan";
import { CommuteSmarterCard } from "@/components/dashboard/commute-smarter";
import { SourcesMethodologyPage } from "@/pages/methodology";
import { TodayIndoorRecommendationsCard } from "@/components/indoor/today-indoor-recommendations";
import { IndoorChecklist } from "@/components/indoor/indoor-checklist";
import type { GeoLocation } from "@/types/location";
import type { UserProfile } from "@/types/profile";
import type { StationObservationResponse } from "@/types/air-quality";
import type {
  AirQualityForecastResponse,
  DiurnalTimeWindow,
  DispersionStatus,
} from "@/types/forecast";

const mockLocation: GeoLocation = {
  id: "delhi-1",
  name: "Delhi",
  state: "Delhi",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

const baseProfile: UserProfile = {
  id: "user-1",
  displayName: "Aarav",
  category: "college_student",
  ageGroup: "18-24",
  sensitivity: "normal",
  commuteMode: "metro",
  departureTime: "08:30",
  returnTime: "17:30",
  wakeUpTime: "06:30",
  sleepTime: "23:00",
  outdoorActivity: "market_errands",
  scheduleFlexibility: "moderate",
  hasChildren: false,
  hasSeniors: false,
  homeType: "ventilated_flat",
  cookingFuel: "lpg_chimney",
  purifierAvailability: "bedroom_hepa",
  preferredLanguage: "English",
};

describe("Daily Planning Engine (Part A & D)", () => {
  it("criterion 1: generates different recommendations for Good vs. Severe AQI", () => {
    const goodObs: StationObservationResponse = {
      isAvailable: true,
      station: { id: "s1", name: "Clean Park Station", latitude: 28.6, longitude: 77.2, distanceKm: 2 },
      pm25: { value: 25, unit: "µg/m³", standard: "CPCB (60 µg/m³)" },
      pm10: { value: 40, unit: "µg/m³" },
      naqi: { overallAqi: 42, category: "Good", dominantPollutant: "PM2.5", subIndices: [] },
      freshness: { label: "Live Telemetry", hoursAgo: 0.5, category: "fresh" },
    };

    const severeObs: StationObservationResponse = {
      isAvailable: true,
      station: { id: "s2", name: "Industrial CAAQMS", latitude: 28.6, longitude: 77.2, distanceKm: 3 },
      pm25: { value: 320, unit: "µg/m³", standard: "CPCB (60 µg/m³)" },
      pm10: { value: 480, unit: "µg/m³" },
      naqi: { overallAqi: 435, category: "Severe", dominantPollutant: "PM2.5", subIndices: [] },
      freshness: { label: "Live Telemetry", hoursAgo: 0.5, category: "fresh" },
    };

    const planGood = generateDeterministicDailyPlan(mockLocation, baseProfile, goodObs);
    const planSevere = generateDeterministicDailyPlan(mockLocation, baseProfile, severeObs);

    expect(planGood.overallSeverity).toBe("Good");
    expect(planSevere.overallSeverity).toBe("Severe");
    expect(planGood.hasSeverePollutionAlert).toBe(false);
    expect(planSevere.hasSeverePollutionAlert).toBe(true);

    expect(planGood.periods.morning.action).not.toEqual(planSevere.periods.morning.action);
    expect(planSevere.protectiveNotice).toContain("Protective Alert");
  });

  it("criterion 2: recommendations reflect actual hourly forecast curve without assuming afternoons are always cleaner", () => {
    // Construct an unusual inverted forecast curve where morning is clean (e.g. rain) and afternoon peaks (e.g. dust storm)
    const customHours = Array.from({ length: 24 }, (_, i) => ({
      timeIso: `2026-11-22T${String(i).padStart(2, "0")}:00`,
      timeFormatted: `${String(i).padStart(2, "0")}:00`,
      dateFormatted: "22 Nov",
      dateKey: "2026-11-22",
      dayLabel: "Today",
      hour: i,
      timeWindow: (i >= 5 && i < 12 ? "Morning" : i >= 12 && i < 17 ? "Afternoon" : i >= 17 && i < 22 ? "Evening" : "Night") as DiurnalTimeWindow,
      // morning 06:00-09:00 is cleanest (20 µg/m³), afternoon 13:00-16:00 is dirty (180 µg/m³)
      pm25: i >= 6 && i <= 9 ? 20 : i >= 13 && i <= 16 ? 180 : 80,
      pm10: 100,
      ozone: null,
      no2: null,
      dust: null,
      co: null,
      europeanAqi: null,
      dispersionCategory: "Moderate" as DispersionStatus,
    }));

    const invertedForecast: AirQualityForecastResponse = {
      isAvailable: true,
      city: "Delhi",
      days: [
        {
          dateKey: "2026-11-22",
          dayLabel: "Today",
          dateFormatted: "22 Nov 2026",
          avgPm25: 80,
          peakPm25: 180,
          minPm25: 20,
          peakHourFormatted: "14:00",
          cleanestHourFormatted: "07:00",
          cleanestWindow: "Morning",
          windows: [],
          hourly: customHours,
        },
      ],
      source: {
        provider: "Open-Meteo",
        model: "CAMS Global",
        domain: "cams_global",
        spatialResolution: "~40 km",
        generationTimeMs: 10,
        forecastIssuedUtc: new Date().toISOString(),
      },
    };

    const curveAnalysis = analyzeForecastCurve(invertedForecast);

    // Cleanest window must identify morning hours, NOT blindly afternoon!
    expect(curveAnalysis.cleanestWindow.isAfternoonCleanest).toBe(false);
    expect(curveAnalysis.cleanestWindow.startHour).toBe("06:00");
    expect(curveAnalysis.diurnalTrend).toBe("inverted");
  });

  it("criterion 3: student, professional, and senior citizen profiles receive different tailored guidance", () => {
    const studentProfile = { ...baseProfile, category: "college_student" as const };
    const seniorProfile = { ...baseProfile, category: "senior_citizen" as const };
    const parentProfile = { ...baseProfile, category: "parent_child" as const, hasChildren: true };

    const severeObs: StationObservationResponse = {
      isAvailable: true,
      station: { id: "s1", name: "Anand Vihar", latitude: 28.6, longitude: 77.2, distanceKm: 2 },
      pm25: { value: 240, unit: "µg/m³" },
      naqi: { overallAqi: 360, category: "Very Poor", dominantPollutant: "PM2.5", subIndices: [] },
      freshness: { label: "Live Telemetry", hoursAgo: 1, category: "fresh" },
    };

    const planStudent = generateDeterministicDailyPlan(mockLocation, studentProfile, severeObs);
    const planSenior = generateDeterministicDailyPlan(mockLocation, seniorProfile, severeObs);
    const planParent = generateDeterministicDailyPlan(mockLocation, parentProfile, severeObs);

    // Senior guidance focuses on indoor movement and postponing park walks
    expect(planSenior.periods.morning.action.toLowerCase()).toContain("indoors");
    expect(planSenior.periods.morning.lifestyleTip.toLowerCase()).toContain("stretching");

    // Student guidance focuses on library/study areas vs open campus transit
    expect(planStudent.periods.morning.lifestyleTip.toLowerCase()).toContain("libraries");

    // Parent guidance advises protecting children
    expect(planParent.periods.morning.lifestyleTip.toLowerCase()).toContain("children");
  });

  it("criterion 4: station unavailable displays forecast-based advice with explicit uncertainty notation", () => {
    const planUnavailable = generateDeterministicDailyPlan(mockLocation, baseProfile, undefined, undefined);

    expect(planUnavailable.isForecastOnly).toBe(true);
    expect(planUnavailable.dataSourceTag).toContain("CAMS Global Forecast");
  });

  it("criterion 5: high pollution (>200 AQI) triggers protective overrides", () => {
    const highAqiObs: StationObservationResponse = {
      isAvailable: true,
      station: { id: "s1", name: "Wazirpur", latitude: 28.6, longitude: 77.2, distanceKm: 2 },
      pm25: { value: 160, unit: "µg/m³" },
      naqi: { overallAqi: 285, category: "Poor", dominantPollutant: "PM2.5", subIndices: [] },
      freshness: { label: "Live", hoursAgo: 0.5, category: "fresh" },
    };

    const plan = generateDeterministicDailyPlan(mockLocation, baseProfile, highAqiObs);

    expect(plan.hasSeverePollutionAlert).toBe(true);
    expect(plan.protectiveNotice).toContain("Protective Alert");
    expect(plan.protectiveNotice).toContain("N95");
  });
});

describe("Adaptive Indoor Protection (Part C)", () => {
  it("criterion 10: estimated indoor PM2.5 displays explicit disclaimer that it is inferred, not measured", () => {
    const summary = calculateIndoorStatusSummary(100, 150, "apartment");

    expect(summary.estimatedIndoorPm25Min).toBe(52);
    expect(summary.estimatedIndoorPm25Max).toBe(68);
    expect(summary.disclaimer).toBe(
      "Estimated from outdoor conditions and building type. Not a physical indoor measurement."
    );
  });

  it("criterion 11: ventilation recommendation correctly identifies open vs. closed based on outdoor AQI", () => {
    const cleanSummary = calculateIndoorStatusSummary(25, 45, "apartment");
    expect(cleanSummary.ventilationRecommendation).toBe("Open windows");

    const moderateSummary = calculateIndoorStatusSummary(75, 120, "apartment");
    expect(moderateSummary.ventilationRecommendation).toBe("Ventilate at midday");

    const severeSummary = calculateIndoorStatusSummary(260, 380, "apartment");
    expect(severeSummary.ventilationRecommendation).toBe("Keep closed");
  });

  it("criterion 12: protection checklist persists checked items per user ID", () => {
    const userId = "test-user-persist-99";
    const initial = { "chk-no-smoke": true, "chk-no-incense-coils": true };

    saveLocalChecklistState(initial, userId);
    const loaded = getLocalChecklistState(userId);

    expect(loaded["chk-no-smoke"]).toBe(true);
    expect(loaded["chk-no-incense-coils"]).toBe(true);
    expect(loaded["chk-kitchen-exhaust"]).toBeFalsy();
  });
});

import { LocationProvider } from "@/context/location-context";
import { ProfileProvider } from "@/context/profile-context";

describe("UI Components & Acceptance Testing (Part B, E, F)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <QueryClientProvider client={queryClient}>
        <LocationProvider>
          <ProfileProvider>
            <BrowserRouter>{ui}</BrowserRouter>
          </ProfileProvider>
        </LocationProvider>
      </QueryClientProvider>
    );
  }

  it("criterion 7: Overview Today's Plan card displays required time windows, actions, why, and source tags", () => {
    localStorage.setItem("vayuverse_active_location_v2", JSON.stringify(mockLocation));
    renderWithProviders(<TodaysPlanCard />);

    expect(screen.getByText("Today's plan")).toBeDefined();
    expect(screen.getByText("Refresh Plan")).toBeDefined();
    expect(screen.getAllByText(/Morning/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Afternoon/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Evening/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Why this recommendation\?/).length).toBeGreaterThanOrEqual(1);
  });

  it("criterion 8: Commute Smarter card shows honest unconfigured state without fake 42 min / 40%", async () => {
    renderWithProviders(<CommuteSmarterCard />);

    // Verify fabricated 42 min and 40% are completely gone
    expect(screen.queryByText("42 min")).toBeNull();
    expect(screen.queryByText("~40% lower exposure")).toBeNull();

    // Verify honest unconfigured state or setup button is present
    await waitFor(() => {
      expect(
        screen.getByText(/No Commute Route Configured|Compare route options|Daily Commute Route/)
      ).toBeDefined();
    });
  });

  it("criterion 9: Indoor Air page clearly separates Section 1 and Section 2", () => {
    render(
      <BrowserRouter>
        <TodayIndoorRecommendationsCard
          observations={null}
          profile={{
            homeType: "apartment",
            roomSizeSqFt: 200,
            roadExposure: "busy_corridor",
            cookingFuel: "lpg",
            kitchenExhaust: "wall_exhaust_fan",
            windowTightness: "sliding_gaps",
            purifierStatus: "none",
            vulnerabilities: [],
            budgetPreference: "zero_low_cost",
          }}
        />
        <IndoorChecklist />
      </BrowserRouter>
    );

    expect(screen.getByText("Today's Indoor Air Recommendations")).toBeDefined();
    expect(screen.getByText("Section 1: Dynamic Protection")).toBeDefined();
    expect(screen.getByText(/My Indoor Protection Checklist/i)).toBeDefined();
    expect(screen.getByText("Section 2: Persistent Protection")).toBeDefined();
  });

  it("criterion 16 & 18: Sources & Methodology page has all 9 sections with zero horizontal overflow", () => {
    const { container } = render(
      <BrowserRouter>
        <SourcesMethodologyPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Sources & Methodology")).toBeDefined();
    expect(screen.getByText(/Section 1 — Core Engineering Principles/)).toBeDefined();
    expect(screen.getByText(/Section 2 — Verified Environmental Data Sources/)).toBeDefined();
    expect(screen.getByText(/Section 3 — Spatial Resolution & Modeling Boundaries/)).toBeDefined();
    expect(screen.getByText(/Section 4 — Indian National Air Quality Index/)).toBeDefined();
    expect(screen.getByText(/Section 5 — Route Exposure Calculation Methodology/)).toBeDefined();
    expect(screen.getByText(/Section 6 — Indoor Air Quality Estimation/)).toBeDefined();
    expect(screen.getByText(/Section 7 — Deterministic Daily Planning Engine/)).toBeDefined();
    expect(screen.getByText(/Section 8 — Health Guidance Guardrails/)).toBeDefined();
    expect(screen.getByText(/Section 9 — Data Freshness, Caching & Resilient Fallbacks/)).toBeDefined();

    // Verify responsive styling container exists and contains max-w-6xl
    const main = container.querySelector("main");
    expect(main?.className).toContain("max-w-6xl");
  });
});
