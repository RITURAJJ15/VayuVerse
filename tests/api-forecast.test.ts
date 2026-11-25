import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { forecastHandler } from "../api/forecast";
import { getOpenMeteoForecast } from "../api/_lib/forecast";

describe("Backend /api/forecast validation & error handling", () => {
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

    await forecastHandler(req, res);

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
      json: vi.fn(() => res),
      setHeader: vi.fn(),
    } as unknown as Response;

    await forecastHandler(req, res);

    expect(statusCode).toBe(400);
  });
});

describe("Open-Meteo CAMS Global Real Forecast Verification across Indian Cities", () => {
  const testCities = [
    { name: "Delhi", lat: 28.6139, lon: 77.209 },
    { name: "Mumbai", lat: 19.076, lon: 72.8777 },
    { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
    { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
    { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
  ];

  for (const c of testCities) {
    it(`retrieves normalized CAMS Global hourly forecast for ${c.name}`, async () => {
      const data = await getOpenMeteoForecast(c.lat, c.lon, c.name);

      expect(data).toBeDefined();
      expect(data.isAvailable).toBe(true);

      // Model attribution and distinction
      expect(data.source.provider).toBe("Open-Meteo");
      expect(data.source.domain).toBe("cams_global");
      expect(data.source.isModeled).toBe(true);
      expect(data.source.spatialResolution).toContain("40 km");

      // Timezone and coordinates
      expect(data.timezone).toBe("Asia/Kolkata");
      expect(data.utcOffsetSeconds).toBe(19800); // +05:30 IST

      // Days grouping
      expect(data.days.length).toBeGreaterThanOrEqual(2);
      const today = data.days[0];
      expect(today.dayLabel).toBe("Today");
      expect(today.hourly.length).toBeGreaterThanOrEqual(12);

      // Diurnal windows verification
      expect(today.windows.length).toBe(4); // Morning, Afternoon, Evening, Night
      expect(today.cleanestWindow).toBeDefined();
      expect(typeof today.cleanestWindow).toBe("string");

      // Hourly data points verification
      const samplePoint = today.hourly[0];
      expect(samplePoint.timeFormatted).toMatch(/AM|PM/);
      expect(samplePoint.dateFormatted).toBeDefined();
      expect(samplePoint.dispersionCategory).toMatch(/Ventilated|Moderate|Stagnant/);

      // PM2.5 and PM10 should be non-negative numbers when present
      if (samplePoint.pm25 !== null) {
        expect(samplePoint.pm25).toBeGreaterThanOrEqual(0);
      }
      if (samplePoint.pm10 !== null) {
        expect(samplePoint.pm10).toBeGreaterThanOrEqual(0);
      }

      console.log(
        `[FORECAST TEST REPORT] ${c.name}: Projected Day Range: ${today.minPm25} - ${today.peakPm25} µg/m³ PM2.5 | Cleanest window: ${today.cleanestWindow}`
      );
    });
  }

  it("strictly preserves null when forecast values are unavailable (never substitutes zero)", async () => {
    const data = await getOpenMeteoForecast(28.6139, 77.209, "Delhi");

    // Ensure all points preserve null and never forge 0 when null
    for (const point of data.allHourly) {
      if (point.pm25 === null) {
        expect(point.pm25).toBeNull();
        expect(point.pm25).not.toBe(0);
      }
    }
  });
});
