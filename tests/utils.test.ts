import { describe, it, expect } from "vitest";
import { getAqiCategory, getHealthAdvisory, getAqiColor } from "../src/lib/aqi-utils";
import { coordinatesSchema, healthResponseSchema } from "../api/_lib/validation";

describe("AQI Utilities (Indian NAQI)", () => {
  it("categorizes Good AQI (0-50)", () => {
    const cat = getAqiCategory(25);
    expect(cat.label).toBe("Good");
    expect(getAqiColor(25)).toBe("#22c55e");
  });

  it("categorizes Satisfactory AQI (51-100)", () => {
    const cat = getAqiCategory(75);
    expect(cat.label).toBe("Satisfactory");
    expect(getAqiColor(75)).toBe("#84cc16");
  });

  it("categorizes Moderate AQI (101-200)", () => {
    const cat = getAqiCategory(150);
    expect(cat.label).toBe("Moderate");
  });

  it("categorizes Poor AQI (201-300)", () => {
    const cat = getAqiCategory(250);
    expect(cat.label).toBe("Poor");
  });

  it("categorizes Very Poor AQI (301-400)", () => {
    const cat = getAqiCategory(350);
    expect(cat.label).toBe("Very Poor");
  });

  it("categorizes Severe AQI (401-500+)", () => {
    const cat = getAqiCategory(450);
    expect(cat.label).toBe("Severe");
    expect(getAqiCategory(550).label).toBe("Severe");
  });

  it("provides correct health advisories", () => {
    expect(getHealthAdvisory(30)).toContain("good");
    expect(getHealthAdvisory(450)).toContain("Serious risk");
  });
});

describe("Validation Schemas", () => {
  it("validates coordinates inside India's bounding box", () => {
    const valid = coordinatesSchema.safeParse({ latitude: 28.6139, longitude: 77.209 });
    expect(valid.success).toBe(true);

    const outside = coordinatesSchema.safeParse({ latitude: 51.5074, longitude: -0.1278 });
    expect(outside.success).toBe(false);
  });

  it("validates health endpoint response schema", () => {
    const health = {
      status: "ok" as const,
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      environment: "test",
      configuredKeys: {
        OPENAQ_API_KEY: false,
        GEMINI_API_KEY: false,
      },
    };
    const valid = healthResponseSchema.safeParse(health);
    expect(valid.success).toBe(true);
  });
});
