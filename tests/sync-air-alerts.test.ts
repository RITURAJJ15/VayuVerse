import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculatePm25SubIndex,
  calculatePm10SubIndex,
  getPm25ConcentrationCategory,
  getPm10ConcentrationCategory,
  getIndianNaqiCategory,
  calculateOfficialCpcb24hAqi,
  isWithinQuietHours,
  fetchStationObservation,
  processAirAlertsSync,
  constantTimeStringCompare,
} from "../supabase/functions/sync-air-alerts/index";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Phase 7: Production-Safe Edge Function Deployment Readiness", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. CPCB National AQI vs Hourly Concentration Advisory Logic", () => {
    it("strictly refuses to generate an official 24-hour AQI when averaging period is < 24 hours", () => {
      // 1-hour reading with high concentration
      const result = calculateOfficialCpcb24hAqi({
        subIndices: { pm25: 350, pm10: 280, other: [120] },
        averaging: { periodHours: 1, validHoursCount: 1 },
        totalMonitoredPollutants: 3,
      });
      // MUST be null - CPCB does not recognize 1-hour readings as official AQI
      expect(result).toBeNull();
    });

    it("strictly refuses to generate an official 24-hour AQI when data completeness is < 16 hours", () => {
      // 24-hour monitoring window, but only 12 valid hourly readings collected (< 16 hours)
      const result = calculateOfficialCpcb24hAqi({
        subIndices: { pm25: 310, pm10: 250, other: [90] },
        averaging: { periodHours: 24, validHoursCount: 12 },
        totalMonitoredPollutants: 3,
      });
      expect(result).toBeNull();
    });

    it("strictly refuses to generate an official 24-hour AQI when fewer than 3 pollutants or no PM is present", () => {
      // 24 hours and 20 valid hours, but only 2 pollutants
      const resultFewerThan3 = calculateOfficialCpcb24hAqi({
        subIndices: { pm25: 310, pm10: 250 },
        averaging: { periodHours: 24, validHoursCount: 20 },
        totalMonitoredPollutants: 2,
      });
      expect(resultFewerThan3).toBeNull();

      // 3 pollutants, but neither PM2.5 nor PM10 present
      const resultNoPm = calculateOfficialCpcb24hAqi({
        subIndices: { other: [110, 95, 80] },
        averaging: { periodHours: 24, validHoursCount: 20 },
        totalMonitoredPollutants: 3,
      });
      expect(resultNoPm).toBeNull();
    });

    it("calculates an official 24-hour AQI only when all CPCB criteria are fully met (>= 24h, >= 16h data, >= 3 pollutants with PM)", () => {
      const result = calculateOfficialCpcb24hAqi({
        subIndices: { pm25: 314, pm10: 210, other: [150] },
        averaging: { periodHours: 24, validHoursCount: 22 },
        totalMonitoredPollutants: 3,
      });
      expect(result).toBe(314); // Maximum sub-index
    });

    it("accurately maps PM2.5 hourly concentrations to health hazard advisory categories", () => {
      expect(getPm25ConcentrationCategory(15)).toBe("Good"); // 0-30
      expect(getPm25ConcentrationCategory(30)).toBe("Good");
      expect(getPm25ConcentrationCategory(45)).toBe("Satisfactory"); // 31-60
      expect(getPm25ConcentrationCategory(60)).toBe("Satisfactory");
      expect(getPm25ConcentrationCategory(75)).toBe("Moderate"); // 61-90
      expect(getPm25ConcentrationCategory(90)).toBe("Moderate");
      expect(getPm25ConcentrationCategory(105)).toBe("Poor"); // 91-120
      expect(getPm25ConcentrationCategory(120)).toBe("Poor");
      expect(getPm25ConcentrationCategory(180)).toBe("Very Poor"); // 121-250
      expect(getPm25ConcentrationCategory(250)).toBe("Very Poor");
      expect(getPm25ConcentrationCategory(280)).toBe("Severe"); // > 250
    });

    it("accurately maps PM10 hourly concentrations to health hazard advisory categories", () => {
      expect(getPm10ConcentrationCategory(25)).toBe("Good"); // 0-50
      expect(getPm10ConcentrationCategory(50)).toBe("Good");
      expect(getPm10ConcentrationCategory(75)).toBe("Satisfactory"); // 51-100
      expect(getPm10ConcentrationCategory(100)).toBe("Satisfactory");
      expect(getPm10ConcentrationCategory(180)).toBe("Moderate"); // 101-250
      expect(getPm10ConcentrationCategory(250)).toBe("Moderate");
      expect(getPm10ConcentrationCategory(300)).toBe("Poor"); // 251-350
      expect(getPm10ConcentrationCategory(350)).toBe("Poor");
      expect(getPm10ConcentrationCategory(400)).toBe("Very Poor"); // 351-430
      expect(getPm10ConcentrationCategory(430)).toBe("Very Poor");
      expect(getPm10ConcentrationCategory(500)).toBe("Severe"); // > 430
    });

    it("calculates accurate 24-hour PM2.5 and PM10 sub-indices following CPCB piecewise breakpoints", () => {
      expect(calculatePm25SubIndex(15)).toBe(25);
      expect(calculatePm25SubIndex(45)).toBe(75);
      expect(calculatePm25SubIndex(75)).toBe(150);
      expect(calculatePm25SubIndex(105)).toBe(250);
      expect(calculatePm25SubIndex(185)).toBe(350);
      expect(calculatePm25SubIndex(315)).toBe(450);
      expect(calculatePm25SubIndex(600)).toBe(500); // Capped at 500

      expect(calculatePm10SubIndex(25)).toBe(25);
      expect(calculatePm10SubIndex(75)).toBe(75);
      expect(calculatePm10SubIndex(175)).toBe(150);
      expect(calculatePm10SubIndex(300)).toBe(250);
      expect(calculatePm10SubIndex(390)).toBe(350);
      expect(calculatePm10SubIndex(500)).toBe(500);
    });

    it("maps official Indian NAQI values to correct CPCB labels", () => {
      expect(getIndianNaqiCategory(45)).toBe("Good");
      expect(getIndianNaqiCategory(80)).toBe("Satisfactory");
      expect(getIndianNaqiCategory(160)).toBe("Moderate");
      expect(getIndianNaqiCategory(240)).toBe("Poor");
      expect(getIndianNaqiCategory(350)).toBe("Very Poor");
      expect(getIndianNaqiCategory(460)).toBe("Severe");
    });

    it("evaluates quiet hours windows including overnight wrap-around", () => {
      const lateNight = new Date();
      lateNight.setHours(23, 30, 0, 0);
      expect(isWithinQuietHours(lateNight, "22:00", "07:00")).toBe(true);

      const earlyMorning = new Date();
      earlyMorning.setHours(5, 15, 0, 0);
      expect(isWithinQuietHours(earlyMorning, "22:00", "07:00")).toBe(true);

      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);
      expect(isWithinQuietHours(afternoon, "22:00", "07:00")).toBe(false);
    });
  });

  describe("2. OpenAQ Telemetry Validation & Source Integrity", () => {
    it("rejects invalid, negative, NaN, or physically implausible concentrations (> 2500 µg/m³)", async () => {
      const nowUtc = new Date().toISOString();
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v3/locations?")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    id: 9999,
                    name: "Test Pollution Sensor",
                    distance: 1000,
                    sensors: [{ id: 10, parameter: { name: "pm25", displayName: "PM2.5", units: "µg/m³" } }],
                  },
                ],
              }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  { sensorsId: 10, value: -99.0, datetime: { utc: nowUtc } }, // Negative calibration error
                  { sensorsId: 10, value: NaN, datetime: { utc: nowUtc } }, // NaN
                  { sensorsId: 10, value: 3500.0, datetime: { utc: nowUtc } }, // Physically implausible
                ],
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      global.fetch = mockFetch;
      const obs = await fetchStationObservation(28.61, 77.20, "test-key");
      // All readings are invalid, so observation should be null
      expect(obs).toBeNull();
    });

    it("rejects future timestamps (> 10 minutes in the future)", async () => {
      const futureUtc = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 mins in future
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v3/locations?")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    id: 9999,
                    name: "Future Station",
                    distance: 1000,
                    sensors: [{ id: 10, parameter: { name: "pm25", displayName: "PM2.5", units: "µg/m³" } }],
                  },
                ],
              }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [{ sensorsId: 10, value: 150.0, datetime: { utc: futureUtc } }],
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const obs = await fetchStationObservation(28.61, 77.20, "test-key");
      expect(obs).toBeNull();
    });

    it("flags observations older than 3 hours as isFreshForUrgent = false", async () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v3/locations?")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    id: 9999,
                    name: "Stale Station",
                    distance: 1000,
                    sensors: [{ id: 10, parameter: { name: "pm25", displayName: "PM2.5", units: "µg/m³" } }],
                  },
                ],
              }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [{ sensorsId: 10, value: 180.0, datetime: { utc: fourHoursAgo } }],
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const obs = await fetchStationObservation(28.61, 77.20, "test-key");
      expect(obs).not.toBeNull();
      expect(obs?.isFreshForUrgent).toBe(false);
      expect(obs?.hoursAgo).toBeGreaterThanOrEqual(3.9);
      expect(obs?.isOfficial24hAqi).toBe(false);
      expect(obs?.officialAqiValue).toBeNull();
    });

    it("retries once upon encountering OpenAQ 429 rate limit or 503 service unavailable", async () => {
      let callCount = 0;
      const nowUtc = new Date().toISOString();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes("/v3/locations?")) {
          // First attempt returns 429, second attempt succeeds
          if (callCount === 1) {
            return Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    id: 1234,
                    name: "Retry Station",
                    distance: 1000,
                    sensors: [{ id: 10, parameter: { name: "pm25", displayName: "PM2.5", units: "µg/m³" } }],
                  },
                ],
              }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [{ sensorsId: 10, value: 140.0, datetime: { utc: nowUtc } }],
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const obs = await fetchStationObservation(28.61, 77.20, "test-key");
      expect(obs).not.toBeNull();
      expect(obs?.stationName).toBe("Retry Station");
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Core Ingestion Engine & Hourly Advisory Generation", () => {
    it("generates clearly labeled hourly concentration advisories with aqi_value = null", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: "mock-alert-1" }], error: null });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockSupabase = {
        from: (table: string) => {
          if (table === "notification_preferences") {
            return {
              select: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [
                      {
                        user_id: "user-1",
                        minimum_severity: "Poor",
                        quiet_hours_start: "22:00",
                        quiet_hours_end: "07:00",
                        timezone: "Asia/Kolkata",
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          if (table === "saved_locations") {
            return {
              select: () => ({
                in: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "loc-1",
                        user_id: "user-1",
                        name: "Anand Vihar Residence",
                        latitude: 28.6469,
                        longitude: 77.3160,
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: () => ({
                in: () =>
                  Promise.resolve({
                    data: [
                      {
                        user_id: "user-1",
                        category: "office_commuter",
                        sensitivity: "normal",
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          if (table === "air_alerts") {
            return { upsert: mockUpsert };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      } as unknown as SupabaseClient;

      // Mock fresh observation (1 hour ago, PM2.5 = 145 µg/m³ -> Very Poor)
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v3/locations?")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  {
                    id: 101,
                    name: "Anand Vihar Station",
                    distance: 1200,
                    sensors: [{ id: 50, parameter: { name: "pm25", displayName: "PM2.5", units: "µg/m³" } }],
                  },
                ],
              }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [{ sensorsId: 50, value: 145.0, datetime: { utc: oneHourAgo } }],
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      // Execute in live mode (dryRun: false)
      const result = await processAirAlertsSync(mockSupabase, "valid-key", { dryRun: false });
      expect(result.success).toBe(true);
      expect(result.alertsEvaluated).toBe(1);
      expect(result.alertsCreated).toBe(1);
      expect(result.alertsWritten).toBe(1);
      expect(mockUpsert).toHaveBeenCalledTimes(1);

      // Verify the alert payload written to database
      const writtenPayload = mockUpsert.mock.calls[0][0];
      expect(writtenPayload.user_id).toBe("user-1");
      expect(writtenPayload.severity).toBe("Very Poor");
      expect(writtenPayload.observed_value).toBe(145.0);
      expect(writtenPayload.pollutant).toBe("PM2.5");
      // MUST NOT present unsupported official AQI number:
      expect(writtenPayload.aqi_value).toBeNull();
      // MUST clearly label title as hourly concentration advisory:
      expect(writtenPayload.title).toBe("Hourly PM2.5 Advisory: Elevated Hazard (145 µg/m³) - Very Poor Air");
      expect(writtenPayload.message).toContain("Ground sensor at Anand Vihar Station recorded an hourly PM2.5 concentration of 145 µg/m³");
      expect(writtenPayload.message).toContain("official Indian National AQI requires a 24-hour average");
      expect(writtenPayload.fingerprint).toContain("anand-vihar-residence_hourly_advisory_very-poor_pm2.5_");
      expect(writtenPayload.recommended_action).toContain("N95/FFP2 mask");

      // Verify upsert options: onConflict: "user_id,fingerprint", ignoreDuplicates: true
      const upsertOptions = mockUpsert.mock.calls[0][1];
      expect(upsertOptions).toEqual({
        onConflict: "user_id,fingerprint",
        ignoreDuplicates: true,
      });
    });

    it("counts alertsCreated = 0 on duplicate suppression while keeping alertsEvaluated = 1", async () => {
      // Mock duplicate conflict where PostgreSQL emits ON CONFLICT DO NOTHING (data: [])
      const mockSelectDup = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockUpsertDup = vi.fn().mockReturnValue({ select: mockSelectDup });

      const mockSupabase = {
        from: (table: string) => {
          if (table === "notification_preferences") {
            return { select: () => ({ eq: () => Promise.resolve({ data: [{ user_id: "user-1", minimum_severity: "Poor", quiet_hours_start: "22:00", quiet_hours_end: "07:00", timezone: "Asia/Kolkata" }], error: null }) }) };
          }
          if (table === "saved_locations") {
            return { select: () => ({ in: () => Promise.resolve({ data: [{ id: "loc-1", user_id: "user-1", name: "Anand Vihar Residence", latitude: 28.6469, longitude: 77.3160 }], error: null }) }) };
          }
          if (table === "profiles") {
            return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
          }
          if (table === "air_alerts") {
            return { upsert: mockUpsertDup };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      } as unknown as SupabaseClient;

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v3/locations?")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ results: [{ id: 101, name: "Station 1", distance: 1000, sensors: [{ id: 50, parameter: { name: "pm25", units: "µg/m³" } }] }] }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ results: [{ sensorsId: 50, value: 150.0, datetime: { utc: oneHourAgo } }] }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const result = await processAirAlertsSync(mockSupabase, "valid-key", { dryRun: false });
      expect(result.success).toBe(true);
      expect(result.alertsEvaluated).toBe(1);
      // Newly created count must strictly be 0 on duplicate suppression:
      expect(result.alertsCreated).toBe(0);
      expect(result.alertsWritten).toBe(0);
    });

    it("strictly writes zero database records in dry_run mode", async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: (table: string) => {
          if (table === "notification_preferences") {
            return {
              select: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ user_id: "u-1", minimum_severity: "Poor", quiet_hours_start: "22:00", quiet_hours_end: "07:00", timezone: "Asia/Kolkata" }],
                    error: null,
                  }),
              }),
            };
          }
          if (table === "saved_locations") {
            return {
              select: () => ({
                in: () =>
                  Promise.resolve({
                    data: [{ id: "l-1", user_id: "u-1", name: "Location 1", latitude: 28.5, longitude: 77.2 }],
                    error: null,
                  }),
              }),
            };
          }
          if (table === "profiles") {
            return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
          }
          if (table === "air_alerts") {
            return { upsert: mockUpsert };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      } as unknown as SupabaseClient;

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/v3/locations?")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [
                  { id: 10, name: "Station 1", distance: 1000, sensors: [{ id: 1, parameter: { name: "pm25", units: "µg/m³" } }] },
                ],
              }),
          });
        }
        if (url.includes("/latest")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                results: [{ sensorsId: 1, value: 300.0, datetime: { utc: oneHourAgo } }],
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const result = await processAirAlertsSync(mockSupabase, "valid-key", { dryRun: true });
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.alertsEvaluated).toBe(1);
      expect(result.alertsWritten).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("4. Security, Fail-Closed Policy & Gateway Compatibility", () => {
    it("fails closed with 500 when ANY required server secret is missing (CRON_SECRET, SERVICE_ROLE_KEY, SUPABASE_URL, OPENAQ_API_KEY)", async () => {
      const origCron = process.env.CRON_SECRET;
      const origService = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const origUrl = process.env.SUPABASE_URL;
      const origOpenAq = process.env.OPENAQ_API_KEY;

      process.env.CRON_SECRET = "cron-123";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key-123";
      process.env.SUPABASE_URL = "https://example.supabase.co";
      delete process.env.OPENAQ_API_KEY; // Missing OPENAQ_API_KEY

      const { handleRequest } = await import("../supabase/functions/sync-air-alerts/index");
      const req = new Request("http://localhost/functions/v1/sync-air-alerts", {
        method: "POST",
        headers: { Authorization: "Bearer cron-123" },
      });

      const res = await handleRequest(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("required secrets are unconfigured");

      // Restore
      if (origCron) process.env.CRON_SECRET = origCron;
      if (origService) process.env.SUPABASE_SERVICE_ROLE_KEY = origService;
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origOpenAq) process.env.OPENAQ_API_KEY = origOpenAq;
    });

    it("rejects unauthorized callers with 401 when token is missing or invalid", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "super-secret-service-role-key";
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.OPENAQ_API_KEY = "openaq-key-123";

      const { handleRequest } = await import("../supabase/functions/sync-air-alerts/index");

      // No header
      const res1 = await handleRequest(new Request("http://localhost", { method: "POST" }));
      expect(res1.status).toBe(401);

      // Wrong bearer
      const res2 = await handleRequest(
        new Request("http://localhost", {
          method: "POST",
          headers: { Authorization: "Bearer attacker-forged-token" },
        })
      );
      expect(res2.status).toBe(401);

      // Wrong custom header
      const res3 = await handleRequest(
        new Request("http://localhost", {
          method: "POST",
          headers: { "x-cron-secret": "wrong-secret" },
        })
      );
      expect(res3.status).toBe(401);
    });

    it("authenticates via Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (Supabase Gateway JWT compatible)", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-99999";
      process.env.SUPABASE_URL = "https://dicqyoxhplzobaxsnokz.supabase.co";
      process.env.OPENAQ_API_KEY = "openaq-key-123";

      global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

      const { handleRequest } = await import("../supabase/functions/sync-air-alerts/index");
      const req = new Request("http://localhost/functions/v1/sync-air-alerts?dry_run=true", {
        method: "POST",
        headers: {
          Authorization: "Bearer service-role-key-99999",
        },
      });

      const res = await handleRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.dryRun).toBe(true);
    });

    it("authenticates via x-cron-secret: <CRON_SECRET> (pg_cron & Gateway compatible)", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-99999";
      process.env.SUPABASE_URL = "https://dicqyoxhplzobaxsnokz.supabase.co";
      process.env.OPENAQ_API_KEY = "openaq-key-123";

      global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

      const { handleRequest } = await import("../supabase/functions/sync-air-alerts/index");
      const req = new Request("http://localhost/functions/v1/sync-air-alerts?dry_run=true", {
        method: "POST",
        headers: {
          "x-cron-secret": "super-secret-cron-token",
        },
      });

      const res = await handleRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("authenticates via Authorization: Bearer <CRON_SECRET> (CLI --no-verify-jwt mode)", async () => {
      process.env.CRON_SECRET = "super-secret-cron-token";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-99999";
      process.env.SUPABASE_URL = "https://dicqyoxhplzobaxsnokz.supabase.co";
      process.env.OPENAQ_API_KEY = "openaq-key-123";

      global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

      const { handleRequest } = await import("../supabase/functions/sync-air-alerts/index");
      const req = new Request("http://localhost/functions/v1/sync-air-alerts?dry_run=true", {
        method: "POST",
        headers: {
          Authorization: "Bearer super-secret-cron-token",
        },
      });

      const res = await handleRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("constant-time string comparison protects against timing side-channels", () => {
      expect(constantTimeStringCompare("abc", "abc")).toBe(true);
      expect(constantTimeStringCompare("abc", "abd")).toBe(false);
      expect(constantTimeStringCompare("abc", "ab")).toBe(false);
      expect(constantTimeStringCompare("", "")).toBe(true);
    });
  });
});
