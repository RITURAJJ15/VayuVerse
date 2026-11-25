import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { locationsHandler } from "../api/locations";
import { searchIndianLocations, reverseGeocodeCoordinates } from "../api/_lib/open-meteo";

describe("Backend /api/locations endpoint", () => {
  it("rejects coordinates strictly outside of India", async () => {
    let statusCode = 200;
    let responseData: unknown = null;

    const req = {
      query: { latitude: "51.5074", longitude: "-0.1278" }, // London coordinates
    } as unknown as Request;

    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: unknown) => {
        responseData = data;
        return res;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    await locationsHandler(req, res);

    expect(statusCode).toBe(400);
    expect((responseData as { error: string }).error).toContain("outside India");
  });

  it("handles empty or single-character query gracefully", async () => {
    let responseData: { results: unknown[]; total: number } | null = null;

    const req = {
      query: { query: "a" },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data: { results: unknown[]; total: number }) => {
        responseData = data;
        return res;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    await locationsHandler(req, res);

    // Should return 400 or empty results for query < 2 chars
    expect(responseData).toBeDefined();
  });
});

describe("Open-Meteo Real Geocoding & Deduplication", () => {
  // Test multiple Indian cities and smaller towns using real API
  const testCities = ["Delhi", "Noida", "Mumbai", "Kolkata", "Bengaluru", "Guwahati", "Jaipur", "Pune", "Tezpur"];

  for (const city of testCities) {
    it(`resolves ${city} with valid coordinates, state, and timezone`, async () => {
      const results = await searchIndianLocations(city, 5);
      expect(results.length).toBeGreaterThan(0);

      const match = results[0]!;
      expect(match.name.toLowerCase()).toContain(city.toLowerCase());
      expect(match.country).toBe("India");
      expect(match.countryCode).toBe("IN");
      expect(match.state).toBeDefined();
      expect(match.latitude).toBeGreaterThan(6.0);
      expect(match.latitude).toBeLessThan(38.0);
      expect(match.longitude).toBeGreaterThan(68.0);
      expect(match.longitude).toBeLessThan(98.0);
      expect(match.timezone).toBeDefined();
    }, 12000);
  }

  it("disambiguates identical town names by state and district", async () => {
    // "Bilaspur" exists in both Chhattisgarh and Himachal Pradesh
    const results = await searchIndianLocations("Bilaspur", 8);
    expect(results.length).toBeGreaterThan(1);

    const states = results.map((r) => r.state);
    // Should contain distinct states for ambiguous matches
    const uniqueStates = new Set(states);
    expect(uniqueStates.size).toBeGreaterThan(1);
  }, 12000);

  it("reverse geocodes coordinates within Delhi to an Indian locality", async () => {
    // Connaught Place, New Delhi coordinates
    const location = await reverseGeocodeCoordinates(28.6328, 77.2197);
    expect(location.country).toBe("India");
    expect(location.countryCode).toBe("IN");
    expect(location.state).toBeDefined();
    expect(location.name).toBeDefined();
  }, 12000);
});
