// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { RouteComparisonPanel } from "../src/components/decision-lab/route-comparison-panel";

// Mock global fetch for RouteComparisonPanel
function createMockFetch(responseBody: unknown, status = 200) {
  return vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(responseBody),
      text: () => Promise.resolve(JSON.stringify(responseBody)),
    })
  );
}

describe("RouteComparisonPanel UI Component", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders multi-modal travel mode selector and Indian corridor presets", () => {
    render(<RouteComparisonPanel predictedPm25={90} />);

    expect(screen.getByText(/Smart Route Planner/i)).toBeDefined();
    expect(screen.getByRole("tab", { name: /Car/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Two-Wheeler/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Metro \/ Transit/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Walking/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Cycling/i })).toBeDefined();

    // Corridor presets
    expect(screen.getByText(/Delhi NCR Example/i)).toBeDefined();
    expect(screen.getByText(/Mumbai Example/i)).toBeDefined();
    expect(screen.getByText(/Bengaluru Example/i)).toBeDefined();
  });

  it("displays unconfigured fallback state when server indicates OPENROUTESERVICE_API_KEY is missing", async () => {
    globalThis.fetch = createMockFetch({
      isConfigured: false,
      isAvailable: false,
      status: "unconfigured",
      routes: [],
      message: "OpenRouteService is not configured on the server.",
      uncertaintyNotes: [],
    });

    render(<RouteComparisonPanel predictedPm25={90} />);

    // Click demonstration shortcut to set valid origin & destination and auto-compute
    fireEvent.click(screen.getByRole("button", { name: /Delhi NCR Example/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/OpenRouteService is Not Configured \(Server-Side Fallback Active\)/i)
      ).toBeDefined();
      expect(screen.getByText(/Feature Availability Status/i)).toBeDefined();
      expect(screen.getByText(/What-If Departure Simulation:/i)).toBeDefined();
    });
  });

  it("displays honest unsupported guidance when public transit is requested without fabricating schedules", async () => {
    globalThis.fetch = createMockFetch({
      isConfigured: true,
      isAvailable: false,
      status: "unsupported_mode",
      routes: [],
      message: "Public transit route planning is currently unavailable with OpenRouteService.",
      uncertaintyNotes: [],
    });

    render(<RouteComparisonPanel predictedPm25={90} />);

    // Click demonstration shortcut to set valid origin & destination
    fireEvent.click(screen.getByRole("button", { name: /Delhi NCR Example/i }));

    const transitTab = screen.getByRole("tab", { name: /Metro \/ Transit/i });
    fireEvent.click(transitTab);

    await waitFor(() => {
      expect(
        screen.getByText(/Transit Routing Currently Unavailable/i)
      ).toBeDefined();
      expect(screen.getByText(/No Fabricated Schedules/i)).toBeDefined();
      expect(screen.getByText(/Departure & Mode Simulation/i)).toBeDefined();
    });
  });

  it("displays scientific disclosure on coarse CAMS grid resolution vs microenvironments", async () => {
    globalThis.fetch = createMockFetch({
      isConfigured: true,
      isAvailable: true,
      status: "success",
      routes: [
        {
          id: "route-1",
          routeIndex: 0,
          summary: "Primary Route (DRIVE)",
          travelMode: "DRIVE",
          distanceKm: 14.5,
          distanceMeters: 14500,
          durationMinutes: 28,
          durationSeconds: 1680,
          polyline: [[28.63, 77.21], [28.62, 77.36]],
          encodedPolyline: "",
          walkingDistanceMeters: 0,
          walkingDurationMinutes: 0,
          transitChangesCount: 0,
          steps: [],
          emissionsGramsCo2: 2030,
          emissionsFactorCitation: "CPCB 140g",
          exposureProxyUghM3: 21.0,
          warnings: [],
        },
      ],
      selectedMode: "DRIVE",
      origin: { name: "Connaught Place", latitude: 28.63, longitude: 77.21 },
      destination: { name: "Noida", latitude: 28.62, longitude: 77.36 },
      provider: "OpenRouteService via HeiGIT",
      uncertaintyNotes: [],
    });

    render(<RouteComparisonPanel predictedPm25={90} />);

    // Click demonstration shortcut to set valid origin & destination and auto-compute
    fireEvent.click(screen.getByRole("button", { name: /Delhi NCR Example/i }));

    await waitFor(() => {
      expect(screen.getByText(/Route Tradeoffs & Priority Ranking/i)).toBeDefined();
      expect(screen.getByText(/Primary Route \(DRIVE\)/i)).toBeDefined();
      expect(screen.getByText("28")).toBeDefined();
      expect(screen.getByText(/14.5 km/i)).toBeDefined();
      expect(screen.getByText(/2030 g/i)).toBeDefined(); // Carbon emissions
      expect(
        screen.getByText(/Scientific Disclosure: Street-Level Air Quality & Exposure Limitations/i)
      ).toBeDefined();
    });
  });
});
