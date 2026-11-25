// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AirQualityPanel } from "../src/components/air-quality/air-quality-panel";
import { ForecastPanel } from "../src/components/forecast/forecast-panel";
import { DataSourceDetails } from "../src/components/common/data-source-details";
import type { StationObservationResponse } from "../src/types/air-quality";
import type { AirQualityForecastResponse } from "../src/types/forecast";

// Mock Recharts ResponsiveContainer for JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 250 }}>{children}</div>
    ),
  };
});

describe("Environmental Data Transparency & Accurate AQI Standards", () => {
  afterEach(() => {
    cleanup();
  });

  it("proves missing pollutants stay missing and never forge zero or synthetic numbers", () => {
    const stationWithOnlyPm25: StationObservationResponse = {
      isAvailable: true,
      requestedLocation: { city: "Ranchi", latitude: 23.3441, longitude: 85.3096 },
      station: {
        id: 7788,
        name: "Albert Ekka Chowk, Ranchi - JSPCB",
        distanceMeters: 1200,
        distanceKm: 1.2,
        coordinates: { latitude: 23.34, longitude: 85.31 },
        provider: "JSPCB",
        timezone: "Asia/Kolkata",
      },
      pollutants: [
        {
          parameter: "pm25",
          displayName: "PM2.5",
          value: 58.4,
          unit: "µg/m³",
          observedAtUtc: "2026-11-21T18:00:00Z",
          sensorId: 101,
        },
      ],
      pm25: {
        parameter: "pm25",
        displayName: "PM2.5",
        value: 58.4,
        unit: "µg/m³",
        observedAtUtc: "2026-11-21T18:00:00Z",
        sensorId: 101,
      },
      pm10: null, // PM10 missing
      freshness: {
        category: "live",
        label: "Live Telemetry",
        hoursAgo: 1.0,
        mostRecentUtc: "2026-11-21T18:00:00Z",
      },
      naqi: {
        isAvailable: false,
        unavailableReason:
          "Official CPCB Indian AQI requires a minimum of 3 criteria pollutants including PM2.5 or PM10 (this station monitors 1). Verified individual concentrations are displayed separately.",
        overallAqi: null,
        category: "Unavailable",
        color: "#526161",
        responsiblePollutant: null,
        criteriaPollutantsCount: 1,
        hasSufficientPollutants: false,
        averagingNote: "CPCB National AQI methodology requires minimum 3 criteria pollutants.",
      },
      retrievedAtUtc: "2026-11-21T18:30:00Z",
    };

    render(<AirQualityPanel data={stationWithOnlyPm25} isLoading={false} selectedCityName="Ranchi" />);

    // Verified PM2.5 is rendered
    expect(screen.getByText("58.4")).toBeDefined();

    // PM10 is missing: must NOT render 0
    expect(screen.getByText("Not reporting")).toBeDefined();
    expect(screen.queryByText(/^0 µg\/m³/)).toBeNull();

    // Indian AQI is unavailable due to insufficient criteria pollutants (< 3)
    expect(screen.getByText(/Indian AQI unavailable/i)).toBeDefined();
    expect(screen.getByText(/requires a minimum of 3 criteria pollutants/i)).toBeDefined();
  });

  it("proves incorrect AQI standards are not mixed (never relabels European AQI as Indian AQI)", () => {
    const mockForecast: AirQualityForecastResponse = {
      isAvailable: true,
      source: {
        provider: "Open-Meteo",
        model: "Copernicus Atmosphere Monitoring Service (CAMS Global)",
        domain: "cams_global",
        spatialResolution: "~40 km (0.4° global grid)",
        generationTimeMs: 10,
        forecastIssuedUtc: "2026-11-21T18:00:00Z",
        isModeled: true,
      },
      coordinates: { latitude: 28.61, longitude: 77.2, elevation: 214 },
      timezone: "Asia/Kolkata",
      utcOffsetSeconds: 19800,
      units: {
        pm25: "µg/m³",
        pm10: "µg/m³",
        ozone: "µg/m³",
        no2: "µg/m³",
        dust: "µg/m³",
        co: "µg/m³",
      },
      days: [
        {
          dateKey: "2026-11-21",
          dayLabel: "Today",
          dateFormatted: "21 Nov 2026",
          avgPm25: 110.0,
          peakPm25: 150.0,
          minPm25: 70.0,
          peakHourFormatted: "08:00 AM",
          cleanestHourFormatted: "02:00 PM",
          cleanestWindow: "Afternoon (12:00 PM - 05:00 PM)",
          windows: [
            {
              window: "Morning",
              timeRange: "06:00 AM - 12:00 PM",
              avgPm25: 130.0,
              avgPm10: 180.0,
              dispersion: "Stagnant",
              description: "Morning inversion",
            },
          ],
          hourly: [
            {
              timeIso: "2026-11-21T06:00",
              timeFormatted: "06:00 AM",
              dateFormatted: "21 Nov",
              dateKey: "2026-11-21",
              dayLabel: "Today",
              hour: 6,
              timeWindow: "Morning",
              pm25: 130.0,
              pm10: 180.0,
              ozone: 25.0,
              no2: 40.0,
              dust: 20.0,
              co: 500.0,
              europeanAqi: 65, // EAQI value
              dispersionCategory: "Stagnant",
            },
          ],
        },
      ],
      allHourly: [],
      retrievedAtUtc: "2026-11-21T18:30:00Z",
    };

    render(<ForecastPanel data={mockForecast} isLoading={false} selectedCityName="Delhi" />);

    // Forecast panel strictly attributes Copernicus CAMS Model
    expect(screen.getByText(/Copernicus CAMS Model/i)).toBeDefined();

    // Must never describe the model forecast as Indian AQI or ground station observation
    expect(screen.queryByText(/Indian AQI: 65/i)).toBeNull();
    expect(screen.queryByText(/NAQI: 65/i)).toBeNull();
    expect(screen.getByText(/Modeled projections simulate macro atmospheric dynamics/i)).toBeDefined();
  });

  it("proves stale measurements (>24h) trigger prominent historical warning and are never presented as newly observed", () => {
    const staleStation: StationObservationResponse = {
      isAvailable: true,
      requestedLocation: { city: "Shimla", latitude: 31.1048, longitude: 77.1734 },
      station: {
        id: 9912,
        name: "Mall Road, Shimla - HPPCB",
        distanceMeters: 800,
        distanceKm: 0.8,
        coordinates: { latitude: 31.1, longitude: 77.17 },
        provider: "HPPCB",
        timezone: "Asia/Kolkata",
      },
      pollutants: [
        {
          parameter: "pm25",
          displayName: "PM2.5",
          value: 22.0,
          unit: "µg/m³",
          observedAtUtc: "2026-11-18T10:00:00Z", // 3 days ago
          sensorId: 44,
        },
      ],
      pm25: {
        parameter: "pm25",
        displayName: "PM2.5",
        value: 22.0,
        unit: "µg/m³",
        observedAtUtc: "2026-11-18T10:00:00Z",
        sensorId: 44,
      },
      pm10: null,
      freshness: {
        category: "stale",
        label: "Delayed (> 24h)",
        hoursAgo: 72.5,
        mostRecentUtc: "2026-11-18T10:00:00Z",
      },
      retrievedAtUtc: "2026-11-21T18:30:00Z",
    };

    render(<AirQualityPanel data={staleStation} isLoading={false} selectedCityName="Shimla" />);

    // Prominent Historical / Inactive warning is rendered
    expect(screen.getByText(/Historical \/ Inactive Station Data/i)).toBeDefined();
    expect(screen.getByText(/reflect historical archived records and are not representative of current real-time air quality/i)).toBeDefined();
    expect(screen.queryByText(/Live Telemetry/i)).toBeNull();
  });

  it("proves DataSourceDetails component presents complete provenance, methodology, and limitations", () => {
    render(
      <DataSourceDetails
        type="observed"
        sourceName="OpenAQ v3 Global Environmental Archive"
        provider="Central Pollution Control Board (CPCB)"
        stationName="Anand Vihar, Delhi - DPCC"
        stationId={5632}
        coordinates={{ latitude: 28.65, longitude: 77.31 }}
        distanceKm={4.5}
        pollutants={[
          { name: "PM2.5", unit: "µg/m³", value: 145.2 },
          { name: "PM10", unit: "µg/m³", value: 280.0 },
          { name: "NO₂", unit: "ppb", value: 45.6 },
        ]}
        observedAtUtc="2026-11-21T18:00:00Z"
        fetchTimeUtc="2026-11-21T18:35:00Z"
        freshness={{
          category: "live",
          label: "Live Telemetry",
          hoursAgo: 0.5,
        }}
        methodologyNotes="Continuous Ambient Air Quality Monitoring Station (CAAQMS) optical beta-attenuation particulate mass monitors."
        limitations="In-situ physical sensor radius is ~1-5 km. Surrounding arterial road traffic causes micro-scale elevation of particulate levels."
        isOpenByDefault={true}
      />
    );

    // 1. Observed badge
    expect(screen.getByText(/Ground Station Telemetry \(Observed\)/i)).toBeDefined();

    // 2. Freshness
    expect(screen.getByText(/Live Telemetry/i)).toBeDefined();

    // 3. Source and provider
    expect(screen.getByText(/OpenAQ v3 Global Environmental Archive/i)).toBeDefined();
    expect(screen.getByText(/Central Pollution Control Board \(CPCB\)/i)).toBeDefined();

    // 4. Station details & coordinates
    expect(screen.getByText(/Anand Vihar, Delhi - DPCC/i)).toBeDefined();
    expect(screen.getByText(/#5632/i)).toBeDefined();
    expect(screen.getByText(/4.5 km from query center/i)).toBeDefined();

    // 5. Pollutants and units
    expect(screen.getByText("PM2.5")).toBeDefined();
    expect(screen.getByText("145.2")).toBeDefined();
    expect(screen.getByText("PM10")).toBeDefined();
    expect(screen.getByText("280")).toBeDefined();

    // 6. Methodology and limitations
    expect(screen.getByText(/Continuous Ambient Air Quality Monitoring Station/i)).toBeDefined();
    expect(screen.getByText(/In-situ physical sensor radius is ~1-5 km/i)).toBeDefined();
  });
});
