// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "../src/context/location-context";
import { ProfileProvider } from "../src/context/profile-context";
import { DecisionLabPage } from "../src/pages/decision-lab";
import {
  calculateTransportEmissions,
  compareEmissions,
  TRANSPORT_EMISSION_FACTORS,
} from "../src/lib/emissions-calculator";
import {
  extractForecastForTime,
  evaluateOption,
  evaluateDecisionComparison,
  INITIAL_SIMULATION_PRESETS,
  MICROENVIRONMENT_FACTORS,
} from "../src/lib/decision-lab-engine";
import type { AirQualityForecastResponse } from "../src/types/forecast";
import type { DecisionLabScenarioInput } from "../src/types/decision-lab";

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

const MOCK_HOURLY_FORECAST: AirQualityForecastResponse = {
  latitude: 28.6139,
  longitude: 77.209,
  cityName: "New Delhi",
  timezone: "Asia/Kolkata",
  generatedAtUtc: new Date().toISOString(),
  model: {
    name: "Copernicus CAMS Global Atmospheric Composition",
    domain: "Global (0.25° grid)",
    provider: "ECMWF via Open-Meteo",
    disclaimer: "Modeled atmospheric dispersion projections, not ground station measurements.",
  },
  hourly: [
    {
      timestampUtc: "2026-11-22T01:30:00Z",
      timestampLocal: "07:00",
      pm25: 180.0,
      pm10: 270.0,
      timeWindow: "morning",
      isDaylight: true,
    },
    {
      timestampUtc: "2026-11-22T02:30:00Z",
      timestampLocal: "08:00",
      pm25: 220.0,
      pm10: 320.0,
      timeWindow: "morning",
      isDaylight: true,
    },
    {
      timestampUtc: "2026-11-22T03:30:00Z",
      timestampLocal: "09:00",
      pm25: 140.0,
      pm10: 210.0,
      timeWindow: "morning",
      isDaylight: true,
    },
    {
      timestampUtc: "2026-11-22T08:30:00Z",
      timestampLocal: "14:00",
      pm25: 75.0,
      pm10: 120.0,
      timeWindow: "afternoon",
      isDaylight: true,
    },
    {
      timestampUtc: "2026-11-22T12:00:00Z",
      timestampLocal: "17:30",
      pm25: 195.0,
      pm10: 285.0,
      timeWindow: "evening",
      isDaylight: false,
    },
  ],
};

describe("Deterministic Transport Emissions Calculator", () => {
  it("strictly implements versioned CPCB/ARAI emission factors per passenger-km", () => {
    // Metro benchmark: 12 g CO2 / passenger-km
    expect(TRANSPORT_EMISSION_FACTORS.metro.factorGramsCo2PerPassengerKm).toBe(12.0);
    // Two-wheeler: 45 g CO2 / passenger-km
    expect(TRANSPORT_EMISSION_FACTORS.open_two_wheeler.factorGramsCo2PerPassengerKm).toBe(45.0);
    // Petrol car: 140 g CO2 / passenger-km
    expect(TRANSPORT_EMISSION_FACTORS.petrol_car.factorGramsCo2PerPassengerKm).toBe(140.0);
    // Walking: 0 g CO2
    expect(TRANSPORT_EMISSION_FACTORS.walk_cycle.factorGramsCo2PerPassengerKm).toBe(0.0);
  });

  it("calculates exact deterministic carbon emissions for trips without rounding drift", () => {
    const tripMetro = calculateTransportEmissions(14, "metro");
    // 14 km * 12 g = 168 g CO2
    expect(tripMetro.totalCo2Grams).toBe(168.0);
    expect(tripMetro.totalCo2Kg).toBe(0.17);

    const tripCar = calculateTransportEmissions(14, "petrol_car");
    // 14 km * 140 g = 1960 g CO2
    expect(tripCar.totalCo2Grams).toBe(1960.0);
    expect(tripCar.totalCo2Kg).toBe(1.96);

    const comparison = compareEmissions(14, "petrol_car", 14, "metro");
    // 1960 - 168 = 1792 g saved (~91% reduction)
    expect(comparison.savedGrams).toBe(1792.0);
    expect(comparison.reductionPercent).toBe(91);
  });
});

describe("Environmental Exposure Proxy & CAMS Timestamp Matching", () => {
  it("extracts exact predicted PM2.5 corresponding to departure timestamps", () => {
    const point0700 = extractForecastForTime(MOCK_HOURLY_FORECAST, "07:00");
    expect(point0700.isAvailable).toBe(true);
    expect(point0700.pm25).toBe(180.0);

    const point0800 = extractForecastForTime(MOCK_HOURLY_FORECAST, "08:00");
    expect(point0800.isAvailable).toBe(true);
    expect(point0800.pm25).toBe(220.0);

    const point0900 = extractForecastForTime(MOCK_HOURLY_FORECAST, "09:00");
    expect(point0900.isAvailable).toBe(true);
    expect(point0900.pm25).toBe(140.0);
  });

  it("calculates Concentration-Time Proxy using PM2.5 * duration and microenvironment factors", () => {
    // 08:00 AM on two-wheeler for 45 mins (0.75h), PM2.5 = 220 µg/m³
    // Concentration-time proxy = 220 * 0.75 = 165 µg·h/m³
    // Two-wheeler microenvironment factor = 1.0 -> effective = 165
    const optionTwoWheeler = evaluateOption(
      "08:00",
      "open_two_wheeler",
      45,
      12,
      false,
      MOCK_HOURLY_FORECAST
    );

    expect(optionTwoWheeler.forecastPm25).toBe(220.0);
    expect(optionTwoWheeler.concentrationTimeProxyMicrogramHours).toBe(165.0);
    expect(optionTwoWheeler.microenvironmentFactor).toBe(MICROENVIRONMENT_FACTORS.open_two_wheeler);
    expect(optionTwoWheeler.effectiveExposureProxy).toBe(165.0);

    // 08:00 AM on Metro for 45 mins (0.75h)
    // Ambient proxy = 165 µg·h/m³
    // Metro microenvironment factor = 0.20 -> effective = 165 * 0.2 = 33 µg·h/m³
    const optionMetro = evaluateOption(
      "08:00",
      "metro",
      45,
      12,
      false,
      MOCK_HOURLY_FORECAST
    );

    expect(optionMetro.effectiveExposureProxy).toBe(33.0);
  });

  it("handles unsupported data states safely by disabling exposure proxy and reporting missing data", () => {
    const input: DecisionLabScenarioInput = INITIAL_SIMULATION_PRESETS[0]!.input;

    // Call with null forecast
    const result = evaluateDecisionComparison(input, null);

    expect(result.optionA.isForecastAvailable).toBe(false);
    expect(result.optionA.forecastPm25).toBeNull();
    expect(result.optionA.effectiveExposureProxy).toBeNull();
    expect(result.exposureProxyReductionPercent).toBeNull();
    expect(result.confidenceLevel).toBe("Caution");
    expect(result.missingDataItems).toContain("CAMS hourly particulate forecast");

    // Proves deterministic transport emissions still calculate without inserting fake exposure numbers
    expect(result.optionA.totalCo2EmissionsGrams).toBeGreaterThan(0);
    expect(result.optionB.totalCo2EmissionsGrams).toBeGreaterThan(0);
  });
});

describe("Initial 5 Simulations Functionality", () => {
  it("verifies all 5 mandatory simulation presets generate valid comparisons", () => {
    INITIAL_SIMULATION_PRESETS.forEach((preset) => {
      const result = evaluateDecisionComparison(preset.input, MOCK_HOURLY_FORECAST);

      expect(result.optionA).toBeDefined();
      expect(result.optionB).toBeDefined();
      expect(result.verdictHeadline.length).toBeGreaterThan(0);
      expect(result.tradeoffAnalysis.length).toBeGreaterThan(0);

      // Simulation 3: Public Transport should produce substantial emission savings
      if (preset.id === "use-public-transport") {
        expect(result.absoluteCo2SavedGrams).toBeGreaterThan(1000);
        expect(result.emissionsReductionPercent).toBeGreaterThan(80);
      }

      // Simulation 4: Chained Errands should reduce distance and emissions
      if (preset.id === "combine-errands") {
        expect(result.optionB.distanceKm).toBeLessThan(result.optionA.distanceKm);
        expect(result.absoluteCo2SavedGrams).toBeGreaterThan(0);
      }

      // Simulation 5: Indoor Exercise should sharply reduce effective exposure proxy
      if (preset.id === "indoor-exercise") {
        expect(result.optionB.effectiveExposureProxy).toBeLessThan(
          result.optionA.effectiveExposureProxy!
        );
      }
    });
  });
});

describe("What-If Decision Lab UI Page & Interactive Controls", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders page header, preset buttons, and original test landmarks", () => {
    renderWithProviders(<DecisionLabPage />);

    expect(screen.getByText(/What-If Decision Lab/i)).toBeDefined();
    expect(screen.getByText(/Empirical Exposure & Impact Modeling/i)).toBeDefined();
    expect(screen.getByText(/Initial Simulation Scenarios/i)).toBeDefined();

    // Required landmark from original navigation tests
    expect(screen.getByText(/Two-Wheeler vs\. Air-Filtered Metro/i)).toBeDefined();
    expect(screen.getByText(/What if I leave one hour earlier\?/i)).toBeDefined();
    expect(screen.getByText(/What if I leave one hour later\?/i)).toBeDefined();
  });

  it("switches active simulation scenario when a preset is clicked", () => {
    renderWithProviders(<DecisionLabPage />);

    // Click on Preset 4: Combine errands
    const preset4Btn = screen.getByText(/What if I combine errands\?/i);
    expect(preset4Btn).toBeDefined();
    fireEvent.click(preset4Btn);

    // Controls should now reflect errands
    expect(screen.getByText(/Plan A: 2 stop\(s\)/i)).toBeDefined();
    expect(screen.getByText(/Plan B: 1 chained stop/i)).toBeDefined();
  });

  it("opens the assumptions and methodological transparency modal", () => {
    renderWithProviders(<DecisionLabPage />);

    const openDrawerBtn = screen.getByText(/View Calculation Assumptions/i);
    expect(openDrawerBtn).toBeDefined();

    fireEvent.click(openDrawerBtn);

    // Modal should be open
    expect(screen.getByText(/Concentration-Time Exposure Proxy Formula/i)).toBeDefined();
    expect(screen.getByText(/Documented In-Cabin \/ Microenvironment Attenuation/i)).toBeDefined();
    expect(screen.getByText(/Versioned Transport Emission Factors/i)).toBeDefined();

    // Close button
    const closeBtn = screen.getByText(/Close & Return to Decision Lab/i);
    fireEvent.click(closeBtn);

    expect(
      screen.queryByText(/Concentration-Time Exposure Proxy Formula/i)
    ).toBeNull();
  });
});
