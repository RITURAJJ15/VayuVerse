import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapModeToOrsProfile,
  calculateRouteEmissions,
  calculateRouteExposureProxy,
  computeOpenRouteServiceRoutes,
  _clearRouteCacheForTesting,
} from "../api/_lib/openrouteservice";
import type { ComputeRoutesRequest } from "../src/types/routes";

describe("OpenRouteService (ORS) API Integration & Environmental Calculators", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _clearRouteCacheForTesting();
  });

  describe("Travel Mode to ORS Profile Mapping", () => {
    it("maps DRIVE to driving-car profile", () => {
      const res = mapModeToOrsProfile("DRIVE");
      expect(res.profile).toBe("driving-car");
      expect(res.isSupported).toBe(true);
    });

    it("maps TWO_WHEELER to driving-car road profile in India", () => {
      const res = mapModeToOrsProfile("TWO_WHEELER");
      expect(res.profile).toBe("driving-car");
      expect(res.isSupported).toBe(true);
    });

    it("maps WALK to foot-walking profile", () => {
      const res = mapModeToOrsProfile("WALK");
      expect(res.profile).toBe("foot-walking");
      expect(res.isSupported).toBe(true);
    });

    it("maps BICYCLE to cycling-regular profile", () => {
      const res = mapModeToOrsProfile("BICYCLE");
      expect(res.profile).toBe("cycling-regular");
      expect(res.isSupported).toBe(true);
    });

    it("identifies TRANSIT as unsupported with descriptive explanation", () => {
      const res = mapModeToOrsProfile("TRANSIT");
      expect(res.profile).toBeNull();
      expect(res.isSupported).toBe(false);
      expect(res.unsupportedReason).toContain("Public transit route planning is currently unavailable");
    });
  });

  describe("ARAI & CPCB Versioned Transport Emissions Calculation", () => {
    it("calculates driving emissions using CPCB passenger car factor (140 g CO₂/p-km)", () => {
      const result = calculateRouteEmissions("DRIVE", 15.0);
      expect(result.emissionsGramsCo2).toBe(2100); // 15 km * 140 g
      expect(result.citation).toContain("CPCB");
    });

    it("calculates two-wheeler emissions using ARAI BS-VI standard (45 g CO₂/p-km)", () => {
      const result = calculateRouteEmissions("TWO_WHEELER", 20.0);
      expect(result.emissionsGramsCo2).toBe(900); // 20 km * 45 g
      expect(result.citation).toContain("ARAI");
    });

    it("calculates electric metro transit emissions using DMRC factor (12 g CO₂/p-km)", () => {
      const result = calculateRouteEmissions("TRANSIT", 25.0);
      expect(result.emissionsGramsCo2).toBe(300); // 25 km * 12 g
      expect(result.citation).toContain("DMRC");
    });

    it("assigns zero direct emissions to active walking and cycling", () => {
      const walk = calculateRouteEmissions("WALK", 5.0);
      const bike = calculateRouteEmissions("BICYCLE", 12.0);
      expect(walk.emissionsGramsCo2).toBe(0);
      expect(bike.emissionsGramsCo2).toBe(0);
      expect(walk.citation).toContain("Pedestrian");
      expect(bike.citation).toContain("Cycling");
    });
  });

  describe("Microenvironment Concentration-Time Exposure Proxy", () => {
    it("calculates exposure proxy reflecting vehicle microenvironment factors", () => {
      // 30 min drive with ambient PM2.5 = 100 µg/m³
      // In-cabin AC car factor is 0.50 -> 100 * 0.5h * 0.5 = 25.0 µg·h/m³
      const carExposure = calculateRouteExposureProxy("DRIVE", 30, 0, 100);
      expect(carExposure).toBe(25.0);

      // 30 min walk with ambient PM2.5 = 100 µg/m³ -> 100 * 0.5h * 1.0 = 50.0 µg·h/m³
      const walkExposure = calculateRouteExposureProxy("WALK", 30, 30, 100);
      expect(walkExposure).toBe(50.0);
    });

    it("returns null when ambient PM2.5 is not provided", () => {
      expect(calculateRouteExposureProxy("DRIVE", 30, 0, undefined)).toBeNull();
      expect(calculateRouteExposureProxy("DRIVE", 30, 0, 0)).toBeNull();
    });
  });

  describe("Backend Geographic Validation & Fallback Safety", () => {
    const validDelhiReq: ComputeRoutesRequest = {
      origin: {
        name: "Connaught Place, New Delhi",
        latitude: 28.6315,
        longitude: 77.2167,
      },
      destination: {
        name: "Sector 62, Noida",
        latitude: 28.628,
        longitude: 77.3649,
      },
      travelMode: "DRIVE",
    };

    it("rejects coordinates strictly outside India with descriptive error", async () => {
      const outsideIndiaReq: ComputeRoutesRequest = {
        origin: { name: "London", latitude: 51.5074, longitude: -0.1278 },
        destination: { name: "Paris", latitude: 48.8566, longitude: 2.3522 },
        travelMode: "DRIVE",
      };

      await expect(
        computeOpenRouteServiceRoutes(outsideIndiaReq, "test-api-key")
      ).rejects.toThrow(/within the geographical bounds of India/i);
    });

    it("returns unconfigured fallback response when OPENROUTESERVICE_API_KEY is missing", async () => {
      const origKey = process.env.OPENROUTESERVICE_API_KEY;
      delete process.env.OPENROUTESERVICE_API_KEY;

      const response = await computeOpenRouteServiceRoutes(validDelhiReq, "");

      expect(response.isConfigured).toBe(false);
      expect(response.isAvailable).toBe(false);
      expect(response.status).toBe("unconfigured");
      expect(response.routes).toHaveLength(0);
      expect(response.message).toContain("OPENROUTESERVICE_API_KEY");

      if (origKey) process.env.OPENROUTESERVICE_API_KEY = origKey;
    });

    it("returns unsupported_mode when TRANSIT is requested without fabricating schedules", async () => {
      const response = await computeOpenRouteServiceRoutes(
        { ...validDelhiReq, travelMode: "TRANSIT" },
        "test-api-key"
      );

      expect(response.isConfigured).toBe(true);
      expect(response.isAvailable).toBe(false);
      expect(response.status).toBe("unsupported_mode");
      expect(response.routes).toHaveLength(0);
      expect(response.message).toContain("Public transit route planning is currently unavailable");
    });

    it("gracefully handles provider HTTP error (e.g. 403 / 500) without crashing", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 2003,
              message: "Invalid API key or authorization token.",
            },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      );

      const response = await computeOpenRouteServiceRoutes(validDelhiReq, "dummy-mock-key");

      expect(response.isConfigured).toBe(true);
      expect(response.isAvailable).toBe(false);
      expect(response.status).toBe("error");
      expect(response.message).toContain("Invalid API key or authorization token");
    });

    it("handles rate limiting from provider (HTTP 429) gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        )
      );

      const response = await computeOpenRouteServiceRoutes(validDelhiReq, "dummy-mock-key");

      expect(response.isConfigured).toBe(true);
      expect(response.status).toBe("rate_limited");
      expect(response.routes).toHaveLength(0);
    });

    it("transforms mock ORS GeoJSON response into normalized VayuVerse schema with Leaflet [lat, lng] coordinates", async () => {
      const mockOrsGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [77.2167, 28.6315], // [lng, lat]
                [77.2900, 28.6300],
                [77.3649, 28.6280],
              ],
            },
            properties: {
              summary: {
                distance: 18500, // 18.5 km
                duration: 2100, // 35 min
              },
              segments: [
                {
                  distance: 18500,
                  duration: 2100,
                  steps: [
                    {
                      distance: 500,
                      duration: 60,
                      instruction: "Head east on Connaught Place",
                      name: "Connaught Place",
                    },
                    {
                      distance: 18000,
                      duration: 2040,
                      instruction: "Continue onto Barapullah / Noida Link Road",
                      name: "Noida Link Road",
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockOrsGeoJson), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const response = await computeOpenRouteServiceRoutes(
        {
          ...validDelhiReq,
          travelMode: "DRIVE",
          predictedPm25: 120,
        },
        "dummy-mock-key"
      );

      expect(response.isConfigured).toBe(true);
      expect(response.isAvailable).toBe(true);
      expect(response.status).toBe("success");
      expect(response.routes).toHaveLength(1);

      const r = response.routes[0]!;
      expect(r.distanceKm).toBe(18.5);
      expect(r.durationMinutes).toBe(35);
      // Verify GeoJSON [lng, lat] was converted to Leaflet [lat, lng]
      expect(r.polyline).toHaveLength(3);
      expect(r.polyline[0]![0]).toBeCloseTo(28.6315, 4); // lat
      expect(r.polyline[0]![1]).toBeCloseTo(77.2167, 4); // lng
      expect(r.steps).toHaveLength(2);
      expect(r.steps[0]!.instruction).toBe("Head east on Connaught Place");
      expect(r.emissionsGramsCo2).toBe(2590); // 18.5 * 140
      expect(r.exposureProxyUghM3).toBeGreaterThan(0);
    });
  });

  // Integration test with live OpenRouteService API (set OPENROUTESERVICE_LIVE_TEST=true with network access)
  describe.runIf(Boolean(process.env.OPENROUTESERVICE_LIVE_TEST))(
    "Live OpenRouteService API Real Indian Corridor Query",
    () => {
      it("queries real OpenRouteService API for Delhi Connaught Place to Noida Sector 62", async () => {
        const liveReq: ComputeRoutesRequest = {
          origin: {
            name: "Connaught Place, New Delhi",
            latitude: 28.6315,
            longitude: 77.2167,
          },
          destination: {
            name: "Sector 62, Noida",
            latitude: 28.628,
            longitude: 77.3649,
          },
          travelMode: "DRIVE",
          predictedPm25: 95,
        };

        const response = await computeOpenRouteServiceRoutes(liveReq);

        expect(response.isConfigured).toBe(true);
        expect(response.isAvailable).toBe(true);
        expect(response.status).toBe("success");
        expect(response.routes.length).toBeGreaterThan(0);

        const primary = response.routes[0]!;
        expect(primary.distanceKm).toBeGreaterThan(10);
        expect(primary.durationMinutes).toBeGreaterThan(15);
        expect(primary.polyline.length).toBeGreaterThan(10);
        // Ensure lat is in bounds of Delhi (28.x) and lng is (77.x)
        expect(primary.polyline[0]![0]).toBeGreaterThan(25);
        expect(primary.polyline[0]![0]).toBeLessThan(32);
        expect(primary.polyline[0]![1]).toBeGreaterThan(70);
        expect(primary.polyline[0]![1]).toBeLessThan(80);
        expect(primary.emissionsGramsCo2).toBeGreaterThan(1000);

        console.log(
          `[ORS LIVE TEST] Verified real route: ${primary.summary} | Distance: ${primary.distanceKm} km | Duration: ${primary.durationMinutes} min | Polyline points: ${primary.polyline.length}`
        );
      }, 20000);

      it("queries real OpenRouteService walking route", async () => {
        const walkReq: ComputeRoutesRequest = {
          origin: {
            name: "Connaught Place, New Delhi",
            latitude: 28.6315,
            longitude: 77.2167,
          },
          destination: {
            name: "India Gate, New Delhi",
            latitude: 28.6129,
            longitude: 77.2295,
          },
          travelMode: "WALK",
          predictedPm25: 80,
        };

        const response = await computeOpenRouteServiceRoutes(walkReq);
        expect(response.status).toBe("success");
        expect(response.routes.length).toBeGreaterThan(0);
        const route = response.routes[0]!;
        expect(route.walkingDistanceMeters).toBeGreaterThan(0);
        expect(route.emissionsGramsCo2).toBe(0); // Zero direct emissions
      }, 20000);
    }
  );
});
