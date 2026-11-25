import type { GeoLocation } from "@/types/location";
import type { UserProfile } from "@/types/profile";
import type { StationObservationResponse } from "@/types/air-quality";
import type { AirQualityForecastResponse, HourlyForecastPoint } from "@/types/forecast";
import {
  getIndianNaqiCategoryFromAqi,
  getIndianNaqiCategoryFromPm25,
} from "./daily-planning-engine.js";
import type {
  AirAlert,
  AirAlertType,
  AirAlertSeverity,
  NotificationPreferences,
  AlertEvaluationContext,
} from "@/types/alerts";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  user_id: "",
  enabled: true,
  browser_notifications_enabled: false,
  minimum_severity: "Moderate",
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: "Asia/Kolkata",
};

export const SEVERITY_RANK: Record<AirAlertSeverity, number> = {
  Unavailable: 0,
  Good: 1,
  Satisfactory: 2,
  Moderate: 3,
  Poor: 4,
  "Very Poor": 5,
  Severe: 6,
};

/**
 * Checks if the given local time is within quiet hours
 */
export function isWithinQuietHours(
  currentTime: Date,
  startStr: string = "22:00",
  endStr: string = "07:00"
): boolean {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

  if (startMinutes > endMinutes) {
    // Overnight window (e.g. 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Generates an idempotent fingerprint for an alert
 */
export function generateAlertFingerprint(
  locationName: string,
  alertType: AirAlertType,
  severity: AirAlertSeverity,
  pollutant: string | null | undefined,
  timeBucket: string // e.g. "2026-11-22-18" (hourly bucket)
): string {
  const cleanLoc = locationName.toLowerCase().trim().replace(/\s+/g, "-");
  const cleanPol = (pollutant || "aqi").toLowerCase();
  return `${cleanLoc}_${alertType}_${severity.toLowerCase()}_${cleanPol}_${timeBucket}`;
}

/**
 * Constructs personalized protective recommendations based on persona, severity, and context.
 */
export function getPersonalizedAlertGuidance(
  profile: UserProfile,
  severity: AirAlertSeverity,
  pollutant: string,
  observedValueText: string,
  isForecast: boolean
): { title: string; message: string; recommendedAction: string } {
  const isSevere = severity === "Severe" || severity === "Very Poor";
  const isPoor = severity === "Poor";
  const category = profile.category;

  let title: string;
  let message: string;
  let action: string;

  const timePrefix = isForecast ? "Forecast Projection" : "Verified Reading";

  if (isSevere) {
    title = isForecast
      ? `Forecast Advisory: ${severity} Pollution Expected`
      : `High Pollution Alert: ${severity} Ambient Air`;

    message = `${timePrefix} shows ${pollutant} at ${observedValueText}. Atmospheric conditions are trapping fine combustion aerosols near ground breathing level.`;

    if (category === "college_student") {
      action =
        "Relocate outdoor study sessions to campus libraries with filtered AC. Shift from open two-wheeler or cycling to closed bus/metro transit, or wear a well-fitted N95 respirator.";
    } else if (category === "senior_citizen") {
      action =
        "Perform light stretching or walking indoors. Postpone park walks completely. Run bedroom True-HEPA purifier on quiet continuous mode and keep exterior windows latched.";
    } else if (category === "parent_child") {
      action =
        "Keep vehicle windows shut during school commute. Avoid outdoor recess and playground sports. Ensure children wear well-fitted youth particulate respirators for transit.";
    } else if (category === "office_commuter") {
      action =
        "Shift commute to closed mass transit (metro) or keep car cabin on recirculation mode. Request remote work if viable. Limit nonessential outdoor errands.";
    } else {
      action =
        "Reduce nonessential outdoor exposure and postpone heavy outdoor cardio. Move workouts indoors, seal exterior windows, and operate True-HEPA filtration.";
    }
  } else if (isPoor) {
    title = isForecast
      ? `Forecast Advisory: Air Quality Deteriorating to Poor`
      : `Air Quality Advisory: Poor Conditions Observed`;

    message = `${timePrefix} indicates ${pollutant} elevated to ${observedValueText}. Sensitive respiratory tracts may experience irritation during prolonged outdoor exertion.`;

    if (category === "senior_citizen") {
      action =
        "Move morning or evening exercise indoors. Avoid exercising near busy traffic arteries. Ventilate living spaces only briefly during solar midday hours.";
    } else if (category === "college_student") {
      action =
        "Limit prolonged outdoor campus workouts. Prefer shaded, ventilated indoor corridors for study and dining.";
    } else {
      action =
        "Limit strenuous outdoor cardio workouts. If commuting on an open two-wheeler, consider wearing an N95 respirator. Keep windows closed during rush-hour traffic peaks.";
    }
  } else if (severity === "Moderate") {
    title = `Air Quality Update: Moderate Levels`;
    message = `${timePrefix} indicates ${pollutant} is at ${observedValueText}. Background air is acceptable for general population, but sensitive individuals should exercise caution.`;
    action =
      "Ventilate living spaces during peak solar warmth (12:00 – 15:30). Sensitive individuals should reduce prolonged heavy outdoor exertion.";
  } else {
    // Good or Satisfactory
    title = `Air Quality Notice: Favorable Atmospheric Conditions`;
    message = `Ambient air in your area has cleared to ${severity} (${pollutant}: ${observedValueText}). Natural dispersion is active.`;
    action =
      "Safe for outdoor exercise, cycling, and park walks. Open opposite windows for 30–45 minutes to establish natural cross-ventilation and flush indoor carbon dioxide.";
  }

  return { title, message, recommendedAction: action };
}

/**
 * Deterministic Alert Evaluation Engine
 */
export function evaluateAirQualityAlerts(
  location: GeoLocation,
  profile: UserProfile,
  observations?: StationObservationResponse | null,
  forecast?: AirQualityForecastResponse | null,
  previousAlerts: AirAlert[] = [],
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
  currentTime: Date = new Date()
): AlertEvaluationContext {
  const newAlerts: AirAlert[] = [];
  const resolvedAlertIds: string[] = [];
  let requiresPlanInvalidation = false;
  let invalidationReason: string | undefined = undefined;

  const currentHourBucket = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, "0")}-${String(currentTime.getDate()).padStart(2, "0")}-${String(currentTime.getHours()).padStart(2, "0")}`;

  // 1. Telemetry Freshness & Availability Assessment
  const isObsAvailable = Boolean(observations?.isAvailable && observations?.station);
  const obsHoursAgo = observations?.freshness?.hoursAgo ?? 0;
  const isStale = Boolean(
    observations?.freshness?.category === "stale" ||
    (observations?.freshness?.hoursAgo && observations.freshness.hoursAgo > 24)
  );

  // Source-Aware Freshness for Urgent Hazard Alerts (Requirement 6):
  // An emergency warning (Severe, Very Poor, Poor) must be grounded in RECENT physical data (<= 3 hours).
  // A 4 to 23-hour-old measurement is delayed/historical and cannot trigger an active emergency hazard warning.
  const isFreshForUrgentHazard = Boolean(
    isObsAvailable &&
      !isStale &&
      (observations?.freshness?.category === "live" || obsHoursAgo <= 3)
  );

  const activeAlerts = previousAlerts.filter((a) => a.status === "active");

  // Determine current observed conditions
  const pm25Val = isObsAvailable && !isStale ? observations?.pm25?.value ?? null : null;
  const pm10Val = isObsAvailable && !isStale ? observations?.pm10?.value ?? null : null;
  const hasValidAqi = Boolean(
    isObsAvailable &&
    !isStale &&
    observations?.naqi?.overallAqi !== null &&
    observations?.naqi?.overallAqi !== undefined &&
    observations?.naqi?.hasSufficientPollutants
  );
  const aqiVal = hasValidAqi ? observations?.naqi?.overallAqi ?? null : null;

  // Determine observed severity:
  let observedSeverity: AirAlertSeverity = "Moderate";
  let observedPollutantLabel = "PM2.5";
  let observedValueStr = "Awaiting reading";

  if (hasValidAqi && aqiVal !== null) {
    observedSeverity = getIndianNaqiCategoryFromAqi(aqiVal);
    observedPollutantLabel = observations?.naqi?.responsiblePollutant || "AQI";
    observedValueStr = `AQI ${aqiVal} (${observedSeverity})`;
  } else if (pm25Val !== null) {
    // Insufficient criteria pollutants for full AQI: strictly report PM2.5 benchmark
    observedSeverity = getIndianNaqiCategoryFromPm25(pm25Val);
    observedPollutantLabel = "PM2.5";
    observedValueStr = `${Math.round(pm25Val)} µg/m³ (CPCB 24h standard: 60 µg/m³)`;
  } else if (pm10Val !== null) {
    observedSeverity = pm10Val <= 100 ? "Satisfactory" : pm10Val <= 250 ? "Moderate" : pm10Val <= 350 ? "Poor" : "Very Poor";
    observedPollutantLabel = "PM10";
    observedValueStr = `${Math.round(pm10Val)} µg/m³ (CPCB 24h standard: 100 µg/m³)`;
  }

  const minSeverityRank = SEVERITY_RANK[preferences.minimum_severity] || 3;
  const observedSeverityRank = SEVERITY_RANK[observedSeverity];

  // Helper to check existing active fingerprints
  const hasActiveFingerprint = (fp: string) => activeAlerts.some((a) => a.fingerprint === fp);

  // =========================================================================
  // TRIGGER 1 & 2: Current Elevated Pollution / Category Deterioration
  // =========================================================================
  if (isObsAvailable && !isStale && (pm25Val !== null || aqiVal !== null)) {
    const isElevatedHazard = observedSeverity === "Poor" || observedSeverity === "Very Poor" || observedSeverity === "Severe";
    const crossesThreshold = (pm25Val !== null && pm25Val > 60) || (aqiVal !== null && aqiVal > 100);

    // Source-Aware Freshness Gate: Emergency warnings (Poor/Very Poor/Severe) require fresh data (<= 3h).
    // Never treat a 12h or 23h old measurement as an active emergency warning.
    const passesUrgentFreshness = !isElevatedHazard || isFreshForUrgentHazard;

    if (crossesThreshold && observedSeverityRank >= minSeverityRank && passesUrgentFreshness) {
      const alertType: AirAlertType = isElevatedHazard ? "elevated_hazard" : "observed_threshold";
      const fp = generateAlertFingerprint(location.name, alertType, observedSeverity, observedPollutantLabel, currentHourBucket);

      if (!hasActiveFingerprint(fp)) {
        const guidance = getPersonalizedAlertGuidance(
          profile,
          observedSeverity,
          observedPollutantLabel,
          observedValueStr,
          false
        );

        const alert: AirAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user_id: preferences.user_id || "guest",
          location_name: location.name,
          alert_type: alertType,
          severity: observedSeverity,
          status: "active",
          source_type: "observed",
          pollutant: observedPollutantLabel,
          observed_value: pm25Val,
          aqi_value: aqiVal,
          source_timestamp: observations?.station?.lastReportUtc || observations?.pm25?.observedAtUtc || currentTime.toISOString(),
          source_name: observations?.station?.name || "Verified CAAQMS Station",
          title: guidance.title,
          message: guidance.message,
          recommended_action: guidance.recommendedAction,
          fingerprint: fp,
          created_at: currentTime.toISOString(),
        };

        newAlerts.push(alert);

        if (isElevatedHazard) {
          requiresPlanInvalidation = true;
          invalidationReason = `Air quality entered ${observedSeverity} category (${observedValueStr}).`;
        }
      }
    }

    // =========================================================================
    // TRIGGER 5: Material Improvement & Active Warning Resolution
    // =========================================================================
    if (observedSeverity === "Good" || observedSeverity === "Satisfactory") {
      const activeElevatedAlerts = activeAlerts.filter(
        (a) => a.severity === "Poor" || a.severity === "Very Poor" || a.severity === "Severe"
      );

      if (activeElevatedAlerts.length > 0) {
        for (const prev of activeElevatedAlerts) {
          resolvedAlertIds.push(prev.id);
        }

        const resolveFp = generateAlertFingerprint(location.name, "improvement_resolved", observedSeverity, "cleared", currentHourBucket);
        if (!hasActiveFingerprint(resolveFp)) {
          const guidance = getPersonalizedAlertGuidance(
            profile,
            observedSeverity,
            observedPollutantLabel,
            observedValueStr,
            false
          );

          newAlerts.push({
            id: `alert-res-${Date.now()}`,
            user_id: preferences.user_id || "guest",
            location_name: location.name,
            alert_type: "improvement_resolved",
            severity: observedSeverity,
            status: "active",
            source_type: "observed",
            pollutant: observedPollutantLabel,
            observed_value: pm25Val,
            aqi_value: aqiVal,
            source_timestamp: currentTime.toISOString(),
            source_name: observations?.station?.name || "Ground Station",
            title: "Air Quality Cleared: Advisory Lifted",
            message: `Atmospheric dispersion has improved local air quality to ${observedSeverity} (${observedValueStr}). Previous protective restrictions are resolved.`,
            recommended_action: guidance.recommendedAction,
            fingerprint: resolveFp,
            created_at: currentTime.toISOString(),
          });

          requiresPlanInvalidation = true;
          invalidationReason = `Air quality improved to ${observedSeverity}. Favorable outdoor windows restored.`;
        }
      }
    }
  }

  // =========================================================================
  // TRIGGER 4: Forecast Advisory (Upcoming Deterioration in Next Few Hours)
  // =========================================================================
  const forecastHours = forecast?.days?.[0]?.hourly || [];
  if (forecastHours.length > 0) {
    const curHour = currentTime.getHours();
    // Look ahead 1 to 4 hours from current hour, handling midnight wrap-around
    const upcomingHours = forecastHours.filter((h: HourlyForecastPoint) => {
      const diff = (h.hour - curHour + 24) % 24;
      return diff >= 1 && diff <= 4;
    });

    let peakUpcomingPm25 = 0;
    let peakUpcomingHour = curHour + 3;

    for (const h of upcomingHours) {
      if (h.pm25 !== null && h.pm25 > peakUpcomingPm25) {
        peakUpcomingPm25 = h.pm25;
        peakUpcomingHour = h.hour;
      }
    }

    const forecastSeverity = getIndianNaqiCategoryFromPm25(peakUpcomingPm25);
    const forecastSeverityRank = SEVERITY_RANK[forecastSeverity];

    // Trigger if forecast predicts entering Poor, Very Poor, or Severe and is higher than current observed
    if (
      forecastSeverityRank >= 4 &&
      forecastSeverityRank > observedSeverityRank &&
      forecastSeverityRank >= minSeverityRank
    ) {
      const forecastFp = generateAlertFingerprint(
        location.name,
        "forecast_advisory",
        forecastSeverity,
        "PM2.5",
        currentHourBucket
      );

      if (!hasActiveFingerprint(forecastFp)) {
        const guidance = getPersonalizedAlertGuidance(
          profile,
          forecastSeverity,
          "Modeled PM2.5",
          `predicted ~${Math.round(peakUpcomingPm25)} µg/m³ at ${String(peakUpcomingHour).padStart(2, "0")}:00`,
          true
        );

        newAlerts.push({
          id: `alert-fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          user_id: preferences.user_id || "guest",
          location_name: location.name,
          alert_type: "forecast_advisory",
          severity: forecastSeverity,
          status: "active",
          source_type: "forecast",
          pollutant: "PM2.5",
          observed_value: peakUpcomingPm25,
          aqi_value: null,
          source_timestamp: forecast?.source?.forecastIssuedUtc || currentTime.toISOString(),
          source_name: "Copernicus CAMS Global Atmospheric Model (~40km grid)",
          title: guidance.title,
          message: guidance.message,
          recommended_action: guidance.recommendedAction,
          fingerprint: forecastFp,
          created_at: currentTime.toISOString(),
        });
      }
    }
  }

  // =========================================================================
  // TRIGGER 7: Scheduled User Activity Overlaps Elevated Pollution Window
  // =========================================================================
  if (profile.outdoorActivity && profile.outdoorActivity !== "none") {
    const isMorningSport = profile.outdoorActivity === "morning_walk_jog";
    const isEveningSport = profile.outdoorActivity === "evening_sports";

    const curHour = currentTime.getHours();
    const overlapsRoutine =
      (isMorningSport && curHour >= 5 && curHour <= 9) ||
      (isEveningSport && curHour >= 17 && curHour <= 21);

    if (overlapsRoutine && observedSeverityRank >= 4) {
      const routineFp = generateAlertFingerprint(
        location.name,
        "scheduled_activity_risk",
        observedSeverity,
        "routine",
        currentHourBucket
      );

      if (!hasActiveFingerprint(routineFp)) {
        newAlerts.push({
          id: `alert-routine-${Date.now()}`,
          user_id: preferences.user_id || "guest",
          location_name: location.name,
          alert_type: "scheduled_activity_risk",
          severity: observedSeverity,
          status: "active",
          source_type: "observed",
          pollutant: observedPollutantLabel,
          observed_value: pm25Val,
          aqi_value: aqiVal,
          source_timestamp: currentTime.toISOString(),
          source_name: observations?.station?.name || "Ground Station",
          title: `Schedule Conflict: Elevated Air Pollution during ${isMorningSport ? "Morning Jog" : "Evening Activity"}`,
          message: `Your routine outdoor activity coincides with ${observedSeverity} ambient particulate concentrations (${observedValueStr}). High respiration rates during cardio increase deep lung particle deposition.`,
          recommended_action:
            profile.category === "senior_citizen"
              ? "Conduct gentle indoor stretching or postpone workout to midday when solar heating expands the mixing layer."
              : "Move workout indoors to a room with closed windows and mechanical True-HEPA air filtration.",
          fingerprint: routineFp,
          created_at: currentTime.toISOString(),
        });

        requiresPlanInvalidation = true;
        invalidationReason = `Scheduled outdoor workout overlaps ${observedSeverity} pollution window.`;
      }
    }
  }

  // Identify highest priority active alert for the dashboard banner
  const allActive = [
    ...newAlerts,
    ...activeAlerts.filter((a) => !resolvedAlertIds.includes(a.id)),
  ];

  let highestActiveAlert: AirAlert | null = null;
  for (const a of allActive) {
    if (a.status !== "active") continue;
    if (!highestActiveAlert || SEVERITY_RANK[a.severity] > SEVERITY_RANK[highestActiveAlert.severity]) {
      highestActiveAlert = a;
    }
  }

  return {
    newAlerts,
    resolvedAlertIds,
    requiresPlanInvalidation,
    invalidationReason,
    activeBannerAlert: highestActiveAlert,
  };
}

