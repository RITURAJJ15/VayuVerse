// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "../src/context/location-context";
import { ProfileProvider } from "../src/context/profile-context";
import { IndoorAirPage } from "../src/pages/indoor-air";
import {
  calculatePurifierSizing,
  determineConditionalVentilation,
  generateIndoorRecommendations,
  buildIndoorGuardianGuidance,
} from "../src/lib/indoor-air-engine";
import type { HouseholdProfile } from "../src/types/indoor-air";
import type { StationObservationResponse } from "../src/types/air-quality";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <ProfileProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </ProfileProvider>
      </LocationProvider>
    </QueryClientProvider>
  );
}

const PROFILE_BASE: HouseholdProfile = {
  homeType: "apartment",
  roomSizeSqFt: 200,
  roadExposure: "residential_quiet",
  cookingFuel: "lpg",
  kitchenExhaust: "chimney_ducted",
  windowTightness: "modern_sealed",
  purifierStatus: "none",
  vulnerabilities: ["none"],
  budgetPreference: "zero_low_cost",
};

const MOCK_HIGH_POLLUTION_OBS: StationObservationResponse = {
  isAvailable: true,
  station: {
    id: 1,
    name: "Anand Vihar, Delhi - DPCC",
    distanceKm: 2.5,
    coordinates: { latitude: 28.65, longitude: 77.31 },
  },
  provider: { name: "DPCC via OpenAQ", isOfficial: true },
  pm25: {
    value: 185.0,
    unit: "µg/m³",
    lastUpdatedUtc: new Date().toISOString(),
    isStale: false,
  },
  pm10: {
    value: 290.0,
    unit: "µg/m³",
    lastUpdatedUtc: new Date().toISOString(),
    isStale: false,
  },
  naqi: {
    overallAqi: 342,
    category: "Very Poor",
    categoryColor: "#E05A47",
    governingPollutant: "PM2.5",
    healthStatement: "Respiratory illness on prolonged exposure",
    subIndices: { pm25: 342 },
    isOfficialReporting: false,
    methodologyNote: "CPCB piecewise formula",
  },
  freshness: {
    lastObservedUtc: new Date().toISOString(),
    fetchedAtUtc: new Date().toISOString(),
    hoursAgo: 1,
    category: "fresh",
    label: "Fresh (1h ago)",
  },
};

describe("Indoor Air Guardian — Deterministic Engine Personalization", () => {
  afterEach(() => {
    cleanup();
  });

  it("produces materially different advice for two households in the same city based on home conditions", () => {
    // Household A: Biomass fuel, no exhaust, loose windows, busy road, budget zero_low_cost
    const householdA: HouseholdProfile = {
      homeType: "independent_house",
      roomSizeSqFt: 150,
      roadExposure: "busy_corridor",
      cookingFuel: "biomass_wood_coal",
      kitchenExhaust: "none_enclosed",
      windowTightness: "loose_wooden",
      purifierStatus: "none",
      vulnerabilities: ["seniors"],
      budgetPreference: "zero_low_cost",
    };

    // Household B: Induction stove, ducted chimney, sealed windows, quiet road, purifier equipped
    const householdB: HouseholdProfile = {
      homeType: "apartment",
      roomSizeSqFt: 300,
      roadExposure: "residential_quiet",
      cookingFuel: "electric_induction",
      kitchenExhaust: "chimney_ducted",
      windowTightness: "modern_sealed",
      purifierStatus: "single_bedroom_hepa",
      vulnerabilities: ["none"],
      budgetPreference: "premium",
    };

    const recsA = generateIndoorRecommendations(householdA, MOCK_HIGH_POLLUTION_OBS);
    const recsB = generateIndoorRecommendations(householdB, MOCK_HIGH_POLLUTION_OBS);

    const titlesA = recsA.map((r) => r.title.toLowerCase());
    const titlesB = recsB.map((r) => r.title.toLowerCase());

    // Household A gets biomass warnings, window weatherstripping, and exhaust installation
    expect(titlesA.some((t) => t.includes("biomass"))).toBe(true);
    expect(titlesA.some((t) => t.includes("weatherstripping") || t.includes("foam strips"))).toBe(true);
    expect(titlesA.some((t) => t.includes("kitchen air extraction"))).toBe(true);

    // Household B does not get biomass or unvented exhaust alerts
    expect(titlesB.some((t) => t.includes("biomass"))).toBe(false);
    expect(titlesB.some((t) => t.includes("weatherstripping"))).toBe(false);
    // Household B gets purifier placement optimization
    expect(titlesB.some((t) => t.includes("placement") || t.includes("continuous low-speed"))).toBe(true);
  });

  it("provides rich and effective actionable guidance when no air purifier is available", () => {
    const noPurifierProfile: HouseholdProfile = {
      ...PROFILE_BASE,
      purifierStatus: "none",
      budgetPreference: "zero_low_cost",
    };

    const recs = generateIndoorRecommendations(noPurifierProfile, MOCK_HIGH_POLLUTION_OBS);

    // Must still recommend essential low-cost/zero-cost interventions
    const titles = recs.map((r) => r.title.toLowerCase());
    expect(titles.some((t) => t.includes("agarbatti") || t.includes("combustion"))).toBe(true);
    expect(titles.some((t) => t.includes("wet mopping"))).toBe(true);
    expect(titles.some((t) => t.includes("shoe-free"))).toBe(true);
    expect(titles.some((t) => t.includes("clean-air sanctuary"))).toBe(true);

    // Zero-cost recommendations should appear before investment tiers
    const firstRec = recs[0];
    expect(firstRec.costTier).toBe("Zero-Cost");
  });

  it("handles missing outdoor telemetry by issuing diurnal precautionary advice without crashing", () => {
    const adviceMissing = determineConditionalVentilation(PROFILE_BASE, null);
    expect(adviceMissing.status).toBe("data_unavailable_precautionary");
    expect(adviceMissing.headline).toContain("Unavailable");
    expect(adviceMissing.recommendedAction).toContain("12:30");

    const adviceHigh = determineConditionalVentilation(PROFILE_BASE, MOCK_HIGH_POLLUTION_OBS);
    expect(adviceHigh.status).toBe("seal_windows");
    expect(adviceHigh.headline).toContain("Sealed");
  });

  it("calculates CADR purifier sizing matching EPA 4-5 ACH rules of thumb", () => {
    const sizing150 = calculatePurifierSizing(150);
    // 150 sq ft * 0.092903 m²/ft² * 2.7m = ~37.6 m³
    // 37.6 * 4.5 ACH = ~169 m³/h (~100 CFM)
    expect(sizing150.requiredAch).toBe(4.5);
    expect(sizing150.recommendedCadrM3H).toBeGreaterThan(150);
    expect(sizing150.recommendedCadrM3H).toBeLessThan(200);
    expect(sizing150.recommendedCadrCfm).toBeGreaterThan(80);
    expect(sizing150.safetyWarnings.some((w) => w.toLowerCase().includes("ozone"))).toBe(true);
    expect(sizing150.safetyWarnings.some((w) => w.toLowerCase().includes("kitchen"))).toBe(true);
  });

  it("strictly enforces scientific safeguards: never synthesizes an indoor AQI and debunks houseplant myths", () => {
    const guidance = buildIndoorGuardianGuidance(PROFILE_BASE, MOCK_HIGH_POLLUTION_OBS);

    // Unmeasured indoor air notice
    expect(guidance.indoorMeasurementNotice).toContain("Indoor air quality is NOT identical to outdoor AQI");
    expect(guidance.scientificSafeguards.unmeasuredIndoorAirNotice).toContain("NO SYNTHETIC INDOOR AQI");

    // Plant myth debunking
    expect(guidance.scientificSafeguards.debunkedPlantMyth).toContain("1989 NASA study");
    expect(guidance.scientificSafeguards.debunkedPlantMyth).toContain("100 to 1,000 plants per room");
  });
});

describe("Indoor Air Guardian UI Page and Interactive Form Controls", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders page header, conditional ventilation card, and original room blueprint landmarks", () => {
    renderWithProviders(<IndoorAirPage />);

    expect(screen.getByText(/Indoor Air Guardian/i)).toBeDefined();
    expect(screen.getByText(/Residential Infiltration Defense/i)).toBeDefined();
    expect(screen.getByText(/Real-Time Conditional Ventilation Protocol/i)).toBeDefined();
    expect(screen.getByText(/Personalized Indoor Protection Checklist/i)).toBeDefined();

    // Original room-by-room blueprint landmarks
    expect(screen.getAllByText(/Master Bedroom/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kitchen & Cooking Area/i)).toBeDefined();
    expect(screen.getByText(/Living & Dining Room/i)).toBeDefined();
    expect(screen.getByText(/Children & Study Room/i)).toBeDefined();
  });

  it("updates guidance dynamically when user alters household form controls", () => {
    renderWithProviders(<IndoorAirPage />);

    // Select Cooking Fuel dropdown and switch to Biomass
    const fuelSelect = screen.getByLabelText(/Type of Cooking Fuel/i) as HTMLSelectElement;
    expect(fuelSelect).toBeDefined();

    fireEvent.change(fuelSelect, { target: { value: "biomass_wood_coal" } });
    expect(fuelSelect.value).toBe("biomass_wood_coal");

    // Should immediately display the critical biomass warning in the checklist
    expect(
      screen.getByText(/Urgent Biomass\/Solid Fuel Airway Isolation/i)
    ).toBeDefined();
  });

  it("opens the scientific sources and methodological limitations drawer modal", () => {
    renderWithProviders(<IndoorAirPage />);

    const openDrawerBtn = screen.getByText(/Review Scientific Sources/i);
    expect(openDrawerBtn).toBeDefined();

    fireEvent.click(openDrawerBtn);

    // Modal dialog should now be visible
    expect(
      screen.getByText(/Safeguard 1: Outdoor AQI Is Not Indoor Air Quality/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Safeguard 2: Houseplants Cannot Replace HEPA Filtration/i)
    ).toBeDefined();
    expect(
      screen.getAllByText(/US EPA 402-F-08-004/i).length
    ).toBeGreaterThan(0);

    // Close button works
    const closeBtn = screen.getByText(/Close & Return to Guidance/i);
    fireEvent.click(closeBtn);

    expect(
      screen.queryByText(/Safeguard 1: Outdoor AQI Is Not Indoor Air Quality/i)
    ).toBeNull();
  });
});
