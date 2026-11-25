// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ForecastPanel } from "../src/components/forecast/forecast-panel";
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

describe("ForecastPanel Component (Design D - Modeled Atmospheric Projections)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading skeleton state when isLoading is true", () => {
    const { container } = render(<ForecastPanel isLoading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse-slow");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders unavailable/error state with clear message when data is unavailable", () => {
    const unavailableData: AirQualityForecastResponse = {
      isAvailable: false,
      unavailableReason: "Open-Meteo Air Quality forecast timed out after 8 seconds.",
      source: {
        provider: "Open-Meteo",
        model: "Copernicus Atmosphere Monitoring Service (CAMS Global)",
        domain: "cams_global",
        spatialResolution: "~40 km (0.4° global grid)",
        generationTimeMs: 12,
        forecastIssuedUtc: new Date().toISOString(),
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
      days: [],
      allHourly: [],
      retrievedAtUtc: new Date().toISOString(),
    };

    render(<ForecastPanel data={unavailableData} isLoading={false} />);

    expect(screen.getByText(/Atmospheric Forecast Temporarily Unavailable/i)).toBeDefined();
    expect(screen.getByText(/timed out after 8 seconds/i)).toBeDefined();
  });

  it("renders populated forecast with explicit model distinctions, diurnal windows, and day toggles", () => {
    const mockForecast: AirQualityForecastResponse = {
      isAvailable: true,
      source: {
        provider: "Open-Meteo",
        model: "Copernicus Atmosphere Monitoring Service (CAMS Global)",
        domain: "cams_global",
        spatialResolution: "~40 km (0.4° global grid)",
        generationTimeMs: 15,
        forecastIssuedUtc: "2026-11-21T18:00:00.000Z",
        isModeled: true,
      },
      coordinates: { latitude: 28.6139, longitude: 77.209, elevation: 214 },
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
          avgPm25: 142.5,
          peakPm25: 180.2,
          minPm25: 85.0,
          peakHourFormatted: "08:00 AM",
          cleanestHourFormatted: "03:00 PM",
          cleanestWindow: "Afternoon (12:00 PM - 05:00 PM)",
          windows: [
            {
              window: "Morning",
              timeRange: "06:00 AM - 12:00 PM",
              avgPm25: 165.4,
              avgPm10: 210.1,
              dispersion: "Stagnant",
              description: "Surface thermal inversion suppresses vertical dispersion.",
            },
            {
              window: "Afternoon",
              timeRange: "12:00 PM - 05:00 PM",
              avgPm25: 89.2,
              avgPm10: 120.5,
              dispersion: "Moderate",
              description: "Solar boundary layer warming enhances vertical pollutant mixing.",
            },
            {
              window: "Evening",
              timeRange: "05:00 PM - 10:00 PM",
              avgPm25: 155.0,
              avgPm10: 195.0,
              dispersion: "Stagnant",
              description: "Declining ambient temperatures lead to particulate accumulation.",
            },
            {
              window: "Night",
              timeRange: "10:00 PM - 06:00 AM",
              avgPm25: 170.0,
              avgPm10: 215.0,
              dispersion: "Stagnant",
              description: "Nocturnal boundary layer contraction.",
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
              pm25: 160.0,
              pm10: 200.0,
              ozone: 20.0,
              no2: 30.0,
              dust: 15.0,
              co: 500.0,
              europeanAqi: 75,
              dispersionCategory: "Stagnant",
            },
            {
              timeIso: "2026-11-21T14:00",
              timeFormatted: "02:00 PM",
              dateFormatted: "21 Nov",
              dateKey: "2026-11-21",
              dayLabel: "Today",
              hour: 14,
              timeWindow: "Afternoon",
              pm25: 85.0,
              pm10: 110.0,
              ozone: 50.0,
              no2: 15.0,
              dust: 12.0,
              co: 350.0,
              europeanAqi: 45,
              dispersionCategory: "Moderate",
            },
          ],
        },
        {
          dateKey: "2026-11-22",
          dayLabel: "Tomorrow",
          dateFormatted: "22 Nov 2026",
          avgPm25: 130.0,
          peakPm25: 165.0,
          minPm25: 75.0,
          peakHourFormatted: "08:00 AM",
          cleanestHourFormatted: "03:00 PM",
          cleanestWindow: "Afternoon (12:00 PM - 05:00 PM)",
          windows: [],
          hourly: [],
        },
      ],
      allHourly: [],
      retrievedAtUtc: "2026-11-21T18:00:00.000Z",
    };

    const onRefresh = vi.fn();

    render(
      <ForecastPanel
        data={mockForecast}
        isLoading={false}
        selectedCityName="New Delhi"
        onRefresh={onRefresh}
      />
    );

    // 1. Model badge and title
    expect(screen.getByText(/Atmospheric Dispersion Forecast/i)).toBeDefined();
    expect(screen.getByText(/Copernicus CAMS Model/i)).toBeDefined();
    expect(screen.getByText(/Simulated aerosol dispersion for New Delhi/i)).toBeDefined();

    // 2. Cleanest window highlight banner
    expect(screen.getByText(/Cleanest Daily Atmospheric Window:/i)).toBeDefined();
    expect(screen.getByText(/Afternoon \(12:00 PM - 05:00 PM\)/i)).toBeDefined();

    // 3. Diurnal window cards
    expect(screen.getByText(/Morning \(06:00 - 12:00\)/i)).toBeDefined();
    expect(screen.getByText(/165.4 µg\/m³/i)).toBeDefined();
    expect(screen.getByText(/Afternoon \(12:00 - 17:00\)/i)).toBeDefined();
    expect(screen.getByText(/89.2 µg\/m³/i)).toBeDefined();
    expect(screen.getByText(/Evening \(17:00 - 22:00\)/i)).toBeDefined();
    expect(screen.getByText(/155 µg\/m³/i)).toBeDefined();

    // 4. Day tabs toggle
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.getByText("Tomorrow")).toBeDefined();

    // 5. Pollutant selection buttons
    expect(screen.getByRole("button", { name: "PM2.5" })).toBeDefined();
    expect(screen.getByRole("button", { name: "PM10" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ozone" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Dust" })).toBeDefined();

    // 6. Test Model Details drawer toggle
    const modelDetailsBtn = screen.getByRole("button", { name: /Model Details/i });
    fireEvent.click(modelDetailsBtn);
    expect(screen.getByText(/Eulerian numerical fluid dynamics/i)).toBeDefined();
    expect(screen.getByText(/Global spatial grid resolution of ~40 km/i)).toBeDefined();

    // 7. Test Refresh button
    const syncBtn = screen.getByRole("button", { name: /Sync/i });
    fireEvent.click(syncBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
