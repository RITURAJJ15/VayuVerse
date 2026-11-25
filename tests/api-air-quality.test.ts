import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { airQualityHandler } from "../api/air-quality";
import { getOpenAQObservations } from "../api/_lib/openaq";

const API_KEY = "15f90044feaa325be8ababfd3392fe6ef612c7f5b9cb46bd3b36339a5fd93d5e";

describe("Backend /api/air-quality validation & error handling", () => {
  it("rejects coordinates strictly outside India with HTTP 400", async () => {
    let statusCode = 200;
    let responseData: Record<string, unknown> | null = null;

    const req = {
      query: { latitude: "51.5074", longitude: "-0.1278" }, // London
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

    await airQualityHandler(req, res);

    expect(statusCode).toBe(400);
    expect((responseData?.error as string) || "").toContain("outside India");
  });

  it("rejects missing latitude/longitude with HTTP 400", async () => {
    let statusCode = 200;

    const req = {
      query: { city: "Delhi" },
    } as unknown as Request;

    const res = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn(() => {
        return res;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    await airQualityHandler(req, res);

    expect(statusCode).toBe(400);
  });
});

describe("OpenAQ v3 Real Monitoring Station Verification across 5 Mandatory Indian Cities", () => {
  const cities = [
    { name: "Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
    { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
  ];

  for (const c of cities) {
    it(`retrieves verified actual station observations for ${c.name}`, async () => {
      const data = await getOpenAQObservations(c.lat, c.lon, c.name, API_KEY);

      expect(data).toBeDefined();
      expect(data.isAvailable).toBe(true);
      expect(data.station).toBeDefined();
      expect(data.station!.name).toBeDefined();
      expect(data.station!.distanceKm).toBeGreaterThanOrEqual(0);
      expect(data.station!.distanceKm).toBeLessThanOrEqual(25); // Within 25km radius
      expect(data.pollutants.length).toBeGreaterThan(0);

      // Verify that every pollutant has positive/finite value, valid unit, and exact timestamp
      for (const p of data.pollutants) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(typeof p.value).toBe("number");
        expect(p.unit).toBeDefined();
        expect(p.observedAtUtc).toBeDefined();
        expect(new Date(p.observedAtUtc).getTime()).toBeGreaterThan(0);
      }

      // Check freshness categorization
      expect(["live", "recent", "delayed", "stale"]).toContain(data.freshness.category);
      expect(data.freshness.label).toBeDefined();
      expect(data.retrievedAtUtc).toBeDefined();

      console.log(`[TEST REPORT] ${c.name}: Station "${data.station!.name}" (${data.station!.distanceKm} km away) | Freshness: ${data.freshness.label} | Pollutants: ${data.pollutants.map((p) => `${p.parameter}=${p.value} ${p.unit}`).join(", ")}`);
    }, 20000);
  }
});
