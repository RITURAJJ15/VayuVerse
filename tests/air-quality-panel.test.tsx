// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AirQualityPanel } from "../src/components/air-quality/air-quality-panel";
import type { StationObservationResponse } from "../src/types/air-quality";

describe("AirQualityPanel Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 'Awaiting verified reading' when data is null/undefined", () => {
    render(<AirQualityPanel isLoading={false} selectedCityName="Pune" />);

    expect(screen.getByText(/Awaiting verified reading/i)).toBeDefined();
    expect(screen.getByText(/No live station synchronized/i)).toBeDefined();
  });

  it("renders unavailable state with clear explanation when isAvailable is false", () => {
    const unavailableData: StationObservationResponse = {
      isAvailable: false,
      unavailableReason: "No verified OpenAQ monitoring stations found within 25 km of Leh.",
      requestedLocation: { city: "Leh", latitude: 34.1526, longitude: 77.5771 },
      pollutants: [],
      pm25: null,
      pm10: null,
      freshness: {
        category: "stale",
        label: "No Station",
        hoursAgo: null,
        mostRecentUtc: null,
      },
      retrievedAtUtc: new Date().toISOString(),
    };

    render(
      <AirQualityPanel
        data={unavailableData}
        isLoading={false}
        selectedCityName="Leh"
      />
    );

    expect(screen.getByText(/No Active Station Telemetry/i)).toBeDefined();
    expect(screen.getByText(/found within 25 km of Leh/i)).toBeDefined();
    expect(screen.getByText(/never generates placeholder pollution numbers/i)).toBeDefined();
  });

  it("renders verified station observations and NAQI when populated", () => {
    const mockObs: StationObservationResponse = {
      isAvailable: true,
      requestedLocation: { city: "Delhi", latitude: 28.6139, longitude: 77.209 },
      station: {
        id: 5634,
        name: "Lodhi Road, New Delhi - IMD",
        distanceMeters: 3030,
        distanceKm: 3.03,
        coordinates: { latitude: 28.59, longitude: 77.22 },
        provider: "CPCB",
        timezone: "Asia/Kolkata",
      },
      pollutants: [
        {
          parameter: "pm25",
          displayName: "PM2.5",
          value: 66.8,
          unit: "µg/m³",
          observedAtUtc: "2026-11-21T15:00:00Z",
          sensorId: 1,
        },
        {
          parameter: "pm10",
          displayName: "PM10",
          value: 134.6,
          unit: "µg/m³",
          observedAtUtc: "2026-11-21T15:00:00Z",
          sensorId: 2,
        },
      ],
      pm25: {
        parameter: "pm25",
        displayName: "PM2.5",
        value: 66.8,
        unit: "µg/m³",
        observedAtUtc: "2026-11-21T15:00:00Z",
        sensorId: 1,
      },
      pm10: {
        parameter: "pm10",
        displayName: "PM10",
        value: 134.6,
        unit: "µg/m³",
        observedAtUtc: "2026-11-21T15:00:00Z",
        sensorId: 2,
      },
      freshness: {
        category: "live",
        label: "Live Telemetry",
        hoursAgo: 1.5,
        mostRecentUtc: "2026-11-21T15:00:00Z",
      },
      naqi: {
        isAvailable: true,
        overallAqi: 123,
        category: "Moderate",
        color: "#B8860B",
        responsiblePollutant: "PM10",
        criteriaPollutantsCount: 3,
        hasSufficientPollutants: true,
        averagingNote: "Calculated strictly from physical concentrations.",
      },
      retrievedAtUtc: "2026-11-21T16:30:00Z",
    };

    const onRefresh = vi.fn();

    render(
      <AirQualityPanel
        data={mockObs}
        isLoading={false}
        selectedCityName="Delhi"
        onRefresh={onRefresh}
      />
    );

    // Station header
    expect(screen.getByText(/Lodhi Road, New Delhi - IMD/i)).toBeDefined();
    expect(screen.getByText(/3.03 km from Delhi center/i)).toBeDefined();
    expect(screen.getByText(/Live Telemetry/i)).toBeDefined();

    // NAQI display
    expect(screen.getByText("123")).toBeDefined();
    expect(screen.getByText(/Moderate/i)).toBeDefined();
    expect(screen.getAllByText(/PM10/i).length).toBeGreaterThan(0);

    // Pollutants values
    expect(screen.getByText("66.8")).toBeDefined();
    expect(screen.getByText("134.6")).toBeDefined();

    // Test Refresh Button
    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Test Station Details toggle
    const detailsBtn = screen.getByRole("button", { name: /Station Details/i });
    fireEvent.click(detailsBtn);
    expect(screen.getByText(/OpenAQ Station ID/i)).toBeDefined();
    expect(screen.getAllByText(/#5634/i).length).toBeGreaterThan(0);
  });
});
