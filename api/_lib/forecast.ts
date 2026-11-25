import dns from "node:dns";
import { ApiHandlerError } from "./errors";
import type {
  AirQualityForecastResponse,
  DayForecastSummary,
  HourlyForecastPoint,
  DiurnalTimeWindow,
  DispersionStatus,
  DiurnalWindowSummary,
} from "../../src/types/forecast";

// Ensure IPv4 first on Node.js to prevent IPv6 timeout on Windows
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

interface OpenMeteoHourlyRaw {
  time: string[];
  pm10: (number | null)[];
  pm2_5: (number | null)[];
  carbon_monoxide: (number | null)[];
  nitrogen_dioxide: (number | null)[];
  sulphur_dioxide: (number | null)[];
  ozone: (number | null)[];
  dust: (number | null)[];
  european_aqi: (number | null)[];
}

interface OpenMeteoUnitsRaw {
  pm10?: string;
  pm2_5?: string;
  carbon_monoxide?: string;
  nitrogen_dioxide?: string;
  sulphur_dioxide?: string;
  ozone?: string;
  dust?: string;
}

interface OpenMeteoAirQualityRawResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  elevation: number;
  hourly_units?: OpenMeteoUnitsRaw;
  hourly?: OpenMeteoHourlyRaw;
}

function getTimeWindow(hour: number): DiurnalTimeWindow {
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 22) return "Evening";
  return "Night";
}

function getDispersionStatus(pm25: number | null): DispersionStatus {
  if (pm25 === null) return "Moderate";
  if (pm25 > 120) return "Stagnant";
  if (pm25 >= 60) return "Moderate";
  return "Ventilated";
}

function formatHour12(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12 < 10 ? "0" + h12 : h12}:00 ${period}`;
}

function formatDateFormatted(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  try {
    const parts = dateStr.split("-").map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Retrieves and normalizes hourly air quality forecast from Open-Meteo CAMS Global domain.
 */
export async function getOpenMeteoForecast(
  latitude: number,
  longitude: number,
  _city?: string
): Promise<AirQualityForecastResponse> {
  const retrievedAtUtc = new Date().toISOString();

  // Open-Meteo Air Quality endpoint using Copernicus Atmosphere Monitoring Service (CAMS Global)
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,european_aqi&domains=cams_global&timezone=Asia%2FKolkata&forecast_days=3`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "VayuVerse-CleanAirNavigator/1.0",
      },
    });
    clearTimeout(timeout);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiHandlerError(504, "Open-Meteo Air Quality forecast timed out after 8 seconds.");
    }
    throw new ApiHandlerError(502, "Failed to connect to Open-Meteo Air Quality API", err);
  }

  if (!response.ok) {
    throw new ApiHandlerError(
      response.status,
      `Open-Meteo Air Quality API responded with HTTP status ${response.status}`
    );
  }

  let data: OpenMeteoAirQualityRawResponse;
  try {
    data = (await response.json()) as OpenMeteoAirQualityRawResponse;
  } catch (err) {
    throw new ApiHandlerError(502, "Failed to parse Open-Meteo forecast JSON response", err);
  }

  const rawHourly = data.hourly;
  if (!rawHourly || !Array.isArray(rawHourly.time) || rawHourly.time.length === 0) {
    return {
      isAvailable: false,
      unavailableReason: "No hourly forecast series returned for this location.",
      source: {
        provider: "Open-Meteo",
        model: "Copernicus Atmosphere Monitoring Service (CAMS Global)",
        domain: "cams_global",
        spatialResolution: "~40 km (0.4° global grid)",
        generationTimeMs: data.generationtime_ms || 0,
        forecastIssuedUtc: retrievedAtUtc,
        isModeled: true,
      },
      coordinates: {
        latitude: data.latitude || latitude,
        longitude: data.longitude || longitude,
        elevation: data.elevation || 0,
      },
      timezone: data.timezone || "Asia/Kolkata",
      utcOffsetSeconds: data.utc_offset_seconds || 19800,
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
      retrievedAtUtc,
    };
  }

  // Parse all hourly points
  const points: HourlyForecastPoint[] = [];
  const dateMap = new Map<string, HourlyForecastPoint[]>();

  for (let i = 0; i < rawHourly.time.length; i++) {
    const rawTime = rawHourly.time[i]; // e.g. "2026-11-21T00:00"
    if (!rawTime) continue;
    const parts = rawTime.split("T");
    const datePart = parts[0];
    const timePart = parts[1];
    if (!datePart || !timePart) continue;

    const hour = parseInt(timePart.split(":")[0] || "0", 10);

    const timeFormatted = formatHour12(hour);
    const dateFormatted = formatDateFormatted(datePart);
    const timeWindow = getTimeWindow(hour);

    // Explicitly preserve null; never replace with 0
    const rawPm25 = rawHourly.pm2_5[i];
    const pm25 = rawPm25 !== null && rawPm25 !== undefined ? Number(rawPm25.toFixed(1)) : null;

    const rawPm10 = rawHourly.pm10[i];
    const pm10 = rawPm10 !== null && rawPm10 !== undefined ? Number(rawPm10.toFixed(1)) : null;

    const rawOzone = rawHourly.ozone?.[i];
    const ozone = rawOzone !== null && rawOzone !== undefined ? Number(rawOzone.toFixed(1)) : null;

    const rawNo2 = rawHourly.nitrogen_dioxide?.[i];
    const no2 = rawNo2 !== null && rawNo2 !== undefined ? Number(rawNo2.toFixed(1)) : null;

    const rawDust = rawHourly.dust?.[i];
    const dust = rawDust !== null && rawDust !== undefined ? Number(rawDust.toFixed(1)) : null;

    const rawCo = rawHourly.carbon_monoxide?.[i];
    const co = rawCo !== null && rawCo !== undefined ? Number(rawCo.toFixed(1)) : null;

    const rawEaqi = rawHourly.european_aqi?.[i];
    const europeanAqi = rawEaqi !== null && rawEaqi !== undefined ? Math.round(rawEaqi) : null;

    const dispersionCategory = getDispersionStatus(pm25);

    const point: HourlyForecastPoint = {
      timeIso: rawTime,
      timeFormatted,
      dateFormatted,
      dateKey: datePart,
      dayLabel: "", // will be assigned during day grouping
      hour,
      timeWindow,
      pm25,
      pm10,
      ozone,
      no2,
      dust,
      co,
      europeanAqi,
      dispersionCategory,
    };

    points.push(point);

    if (!dateMap.has(datePart)) {
      dateMap.set(datePart, []);
    }
    dateMap.get(datePart)!.push(point);
  }

  // Group by days: first dateKey is "Today", second is "Tomorrow", third is date formatted
  const sortedDates = Array.from(dateMap.keys()).sort();
  const days: DayForecastSummary[] = [];

  sortedDates.forEach((dateKey, index) => {
    let dayLabel = formatDateFormatted(dateKey);
    if (index === 0) dayLabel = "Today";
    else if (index === 1) dayLabel = "Tomorrow";

    const dayPoints = dateMap.get(dateKey) || [];

    // Tag each point with its assigned dayLabel
    for (const p of dayPoints) {
      p.dayLabel = dayLabel;
    }

    // Compute peak, min, avg for valid pm25 numbers
    const validPm25 = dayPoints.map((p) => p.pm25).filter((v): v is number => v !== null);

    let avgPm25: number | null = null;
    let peakPm25: number | null = null;
    let minPm25: number | null = null;
    let peakHourFormatted: string | null = null;
    let cleanestHourFormatted: string | null = null;

    if (validPm25.length > 0) {
      const sum = validPm25.reduce((acc, cur) => acc + cur, 0);
      avgPm25 = Number((sum / validPm25.length).toFixed(1));

      peakPm25 = Math.max(...validPm25);
      minPm25 = Math.min(...validPm25);

      const peakPoint = dayPoints.find((p) => p.pm25 === peakPm25);
      if (peakPoint) peakHourFormatted = peakPoint.timeFormatted;

      const cleanestPoint = dayPoints.find((p) => p.pm25 === minPm25);
      if (cleanestPoint) cleanestHourFormatted = cleanestPoint.timeFormatted;
    }

    // Compute diurnal windows
    const windowDefs: { window: DiurnalTimeWindow; timeRange: string; hours: number[] }[] = [
      { window: "Morning", timeRange: "06:00 AM - 12:00 PM", hours: [6, 7, 8, 9, 10, 11] },
      { window: "Afternoon", timeRange: "12:00 PM - 05:00 PM", hours: [12, 13, 14, 15, 16] },
      { window: "Evening", timeRange: "05:00 PM - 10:00 PM", hours: [17, 18, 19, 20, 21] },
      { window: "Night", timeRange: "10:00 PM - 06:00 AM", hours: [22, 23, 0, 1, 2, 3, 4, 5] },
    ];

    const windows: DiurnalWindowSummary[] = windowDefs.map((def) => {
      const winPoints = dayPoints.filter((p) => def.hours.includes(p.hour));
      const winPm25 = winPoints.map((p) => p.pm25).filter((v): v is number => v !== null);
      const winPm10 = winPoints.map((p) => p.pm10).filter((v): v is number => v !== null);

      const winAvg25 = winPm25.length > 0
        ? Number((winPm25.reduce((a, b) => a + b, 0) / winPm25.length).toFixed(1))
        : null;
      const winAvg10 = winPm10.length > 0
        ? Number((winPm10.reduce((a, b) => a + b, 0) / winPm10.length).toFixed(1))
        : null;

      const dispersion = getDispersionStatus(winAvg25);

      let description = "Normal atmospheric conditions.";
      if (def.window === "Afternoon") {
        description = "Solar boundary layer warming enhances vertical pollutant mixing.";
      } else if (def.window === "Morning") {
        description = "Surface thermal inversion suppresses vertical dispersion.";
      } else if (def.window === "Evening") {
        description = "Declining ambient temperatures lead to particulate accumulation.";
      }

      return {
        window: def.window,
        timeRange: def.timeRange,
        avgPm25: winAvg25,
        avgPm10: winAvg10,
        dispersion,
        description,
      };
    });

    // Identify cleanest window (lowest avgPm25 among day windows)
    const dayWindowsOnly = windows.filter((w) => w.window !== "Night" && w.avgPm25 !== null);
    let cleanestWindowStr = "Afternoon (01:00 PM - 04:00 PM)";
    if (dayWindowsOnly.length > 0) {
      dayWindowsOnly.sort((a, b) => (a.avgPm25 ?? 999) - (b.avgPm25 ?? 999));
      const cleanest = dayWindowsOnly[0];
      if (cleanest) {
        cleanestWindowStr = `${cleanest.window} (${cleanest.timeRange})`;
      }
    }

    days.push({
      dateKey,
      dayLabel,
      dateFormatted: formatDateFormatted(dateKey),
      avgPm25,
      peakPm25,
      minPm25,
      peakHourFormatted,
      cleanestHourFormatted,
      cleanestWindow: cleanestWindowStr,
      windows,
      hourly: dayPoints,
    });
  });

  return {
    isAvailable: true,
    source: {
      provider: "Open-Meteo",
      model: "Copernicus Atmosphere Monitoring Service (CAMS Global)",
      domain: "cams_global",
      spatialResolution: "~40 km (0.4° global grid)",
      generationTimeMs: data.generationtime_ms || 0,
      forecastIssuedUtc: retrievedAtUtc,
      isModeled: true,
    },
    coordinates: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
    },
    timezone: data.timezone || "Asia/Kolkata",
    utcOffsetSeconds: data.utc_offset_seconds || 19800,
    units: {
      pm25: "µg/m³",
      pm10: "µg/m³",
      ozone: "µg/m³",
      no2: "µg/m³",
      dust: "µg/m³",
      co: "µg/m³",
    },
    days,
    allHourly: points,
    retrievedAtUtc,
  };
}
