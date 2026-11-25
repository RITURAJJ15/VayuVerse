// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  evaluateAirQualityAlerts,
  isWithinQuietHours,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/alert-engine";
import { NotificationCenterDrawer } from "@/components/notifications/notification-center-drawer";
import { ActiveAlertBanner } from "@/components/dashboard/active-alert-banner";
import { LocationProvider } from "@/context/location-context";
import { ProfileProvider } from "@/context/profile-context";
import { AuthProvider } from "@/context/auth-context";
import type { GeoLocation } from "@/types/location";
import type { UserProfile } from "@/types/profile";
import type { StationObservationResponse } from "@/types/air-quality";
import type { AirQualityForecastResponse, HourlyForecastPoint } from "@/types/forecast";
import type { AirAlert } from "@/types/alerts";

const mockLocation: GeoLocation = {
  id: "loc-delhi",
  name: "Delhi Anand Vihar",
  state: "Delhi",
  country: "India",
  latitude: 28.6469,
  longitude: 77.316,
  timezone: "Asia/Kolkata",
};

const studentProfile: UserProfile = {
  id: "prof-student",
  displayName: "Aarav",
  category: "college_student",
  ageGroup: "18-24",
  sensitivity: "normal",
  commuteMode: "walking",
  departureTime: "08:30",
  returnTime: "16:00",
  wakeUpTime: "07:00",
  sleepTime: "23:00",
  outdoorActivity: "morning_walk_jog",
  scheduleFlexibility: "moderate",
  hasChildren: false,
  hasSeniors: false,
  homeType: "ventilated_flat",
  cookingFuel: "lpg_chimney",
  purifierAvailability: "single_bedroom_hepa",
  preferredLanguage: "English",
};

const commuterProfile: UserProfile = {
  ...studentProfile,
  id: "prof-commuter",
  displayName: "Priya",
  category: "office_commuter",
  ageGroup: "25-34",
  commuteMode: "two_wheeler",
  outdoorActivity: "market_errands",
};

const seniorProfile: UserProfile = {
  ...studentProfile,
  id: "prof-senior",
  displayName: "Mr. Sharma",
  category: "senior_citizen",
  ageGroup: "65+",
  commuteMode: "walking",
  outdoorActivity: "evening_sports",
};

// Fixture 1: Full valid Indian NAQI dataset with severe pollution
const severeStationData: StationObservationResponse = {
  isAvailable: true,
  requestedLocation: {
    city: "Delhi Anand Vihar",
    latitude: 28.6469,
    longitude: 77.316,
  },
  station: {
    id: 101,
    name: "Anand Vihar, Delhi - DPCC",
    distanceMeters: 500,
    distanceKm: 0.5,
    coordinates: { latitude: 28.6469, longitude: 77.316 },
    provider: "OpenAQ / CPCB",
    timezone: "Asia/Kolkata",
    lastReportUtc: new Date().toISOString(),
  },
  pollutants: [
    { parameter: "pm25", displayName: "PM2.5", value: 240, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
    { parameter: "pm10", displayName: "PM10", value: 380, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 2 },
    { parameter: "no2", displayName: "NO₂", value: 85, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 3 },
  ],
  pm25: { parameter: "pm25", displayName: "PM2.5", value: 240, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
  pm10: { parameter: "pm10", displayName: "PM10", value: 380, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 2 },
  freshness: {
    category: "live",
    label: "Updated 15 mins ago",
    hoursAgo: 0.25,
    mostRecentUtc: new Date().toISOString(),
  },
  naqi: {
    isAvailable: true,
    overallAqi: 420,
    category: "Severe",
    color: "#B45309",
    responsiblePollutant: "PM2.5",
    criteriaPollutantsCount: 3,
    hasSufficientPollutants: true,
    averagingNote: "CPCB 24-hour average",
  },
};

// Fixture 2: Moderate station data
const moderateStationData: StationObservationResponse = {
  isAvailable: true,
  requestedLocation: {
    city: "Delhi Anand Vihar",
    latitude: 28.6469,
    longitude: 77.316,
  },
  station: {
    id: 101,
    name: "Anand Vihar, Delhi - DPCC",
    distanceMeters: 500,
    distanceKm: 0.5,
    coordinates: { latitude: 28.6469, longitude: 77.316 },
    provider: "OpenAQ / CPCB",
    timezone: "Asia/Kolkata",
    lastReportUtc: new Date().toISOString(),
  },
  pollutants: [
    { parameter: "pm25", displayName: "PM2.5", value: 45, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
    { parameter: "pm10", displayName: "PM10", value: 85, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 2 },
    { parameter: "no2", displayName: "NO₂", value: 30, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 3 },
  ],
  pm25: { parameter: "pm25", displayName: "PM2.5", value: 45, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
  pm10: { parameter: "pm10", displayName: "PM10", value: 85, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 2 },
  freshness: {
    category: "live",
    label: "Updated 20 mins ago",
    hoursAgo: 0.33,
    mostRecentUtc: new Date().toISOString(),
  },
  naqi: {
    isAvailable: true,
    overallAqi: 125,
    category: "Moderate",
    color: "#EAB308",
    responsiblePollutant: "PM2.5",
    criteriaPollutantsCount: 3,
    hasSufficientPollutants: true,
    averagingNote: "CPCB 24-hour average",
  },
};

// Fixture 3: Good / Clean station data
const goodStationData: StationObservationResponse = {
  isAvailable: true,
  requestedLocation: {
    city: "Delhi Anand Vihar",
    latitude: 28.6469,
    longitude: 77.316,
  },
  station: {
    id: 101,
    name: "Anand Vihar, Delhi - DPCC",
    distanceMeters: 500,
    distanceKm: 0.5,
    coordinates: { latitude: 28.6469, longitude: 77.316 },
    provider: "OpenAQ / CPCB",
    timezone: "Asia/Kolkata",
    lastReportUtc: new Date().toISOString(),
  },
  pollutants: [
    { parameter: "pm25", displayName: "PM2.5", value: 18, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
    { parameter: "pm10", displayName: "PM10", value: 35, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 2 },
  ],
  pm25: { parameter: "pm25", displayName: "PM2.5", value: 18, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
  pm10: { parameter: "pm10", displayName: "PM10", value: 35, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 2 },
  freshness: {
    category: "live",
    label: "Updated 10 mins ago",
    hoursAgo: 0.16,
    mostRecentUtc: new Date().toISOString(),
  },
  naqi: {
    isAvailable: true,
    overallAqi: 45,
    category: "Good",
    color: "#2E7D4E",
    responsiblePollutant: "PM2.5",
    criteriaPollutantsCount: 2,
    hasSufficientPollutants: true,
    averagingNote: "CPCB 24-hour average",
  },
};

// Fixture 4: Missing criteria pollutants (only PM2.5 available)
const sparseStationData: StationObservationResponse = {
  isAvailable: true,
  requestedLocation: {
    city: "Delhi Anand Vihar",
    latitude: 28.6469,
    longitude: 77.316,
  },
  station: {
    id: 102,
    name: "Outer Outpost",
    distanceMeters: 12000,
    distanceKm: 12,
    coordinates: { latitude: 28.5, longitude: 77.1 },
    provider: "OpenAQ Community",
    timezone: "Asia/Kolkata",
    lastReportUtc: new Date().toISOString(),
  },
  pollutants: [
    { parameter: "pm25", displayName: "PM2.5", value: 135, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
  ],
  pm25: { parameter: "pm25", displayName: "PM2.5", value: 135, unit: "µg/m³", observedAtUtc: new Date().toISOString(), sensorId: 1 },
  pm10: null,
  freshness: {
    category: "live",
    label: "Updated 10 mins ago",
    hoursAgo: 0.16,
    mostRecentUtc: new Date().toISOString(),
  },
  naqi: undefined,
};

// Fixture 5: Stale telemetry (>24 hours)
const staleStationData: StationObservationResponse = {
  ...severeStationData,
  freshness: {
    category: "stale",
    label: "Updated 26 hours ago",
    hoursAgo: 26,
    mostRecentUtc: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
};

// Fixture 6: Forecast model lookahead
const currentHour = new Date().getHours();
const mockHourlyPoints: HourlyForecastPoint[] = [
  {
    timeIso: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    timeFormatted: "In 2 hours",
    dateFormatted: "Today",
    dateKey: "today",
    dayLabel: "Today",
    hour: (currentHour + 2) % 24,
    timeWindow: "Afternoon",
    pm25: 180,
    pm10: 290,
    ozone: 40,
    no2: 60,
    dust: 0,
    co: 1.2,
    europeanAqi: 80,
    dispersionCategory: "Stagnant",
  },
  {
    timeIso: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    timeFormatted: "In 3 hours",
    dateFormatted: "Today",
    dateKey: "today",
    dayLabel: "Today",
    hour: (currentHour + 3) % 24,
    timeWindow: "Afternoon",
    pm25: 220,
    pm10: 340,
    ozone: 45,
    no2: 70,
    dust: 0,
    co: 1.4,
    europeanAqi: 90,
    dispersionCategory: "Stagnant",
  },
];

const mockForecastData: AirQualityForecastResponse = {
  coordinates: { latitude: 28.6469, longitude: 77.316 },
  source: {
    provider: "Open-Meteo",
    model: "ECMWF CAMS Global",
    forecastIssuedUtc: new Date().toISOString(),
    resolutionKm: 40,
    attribution: "Copernicus Atmosphere Monitoring Service",
  },
  days: [
    {
      dateKey: "today",
      dayLabel: "Today",
      dateFormatted: "Today",
      hourly: mockHourlyPoints,
      diurnalWindows: [],
      dominantDispersion: "Stagnant",
    },
  ],
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <ProfileProvider>
            <BrowserRouter>{ui}</BrowserRouter>
          </ProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Phase 7: Real-Time Air Quality Alert Engine", () => {
  it("Trigger 1 & 2: Emits AQI Category Deterioration and Elevated Hazard alerts under Severe conditions", () => {
    const result = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      severeStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    expect(result.newAlerts.length).toBeGreaterThan(0);
    const severeAlert = result.newAlerts.find((a) => a.severity === "Severe");
    expect(severeAlert).toBeDefined();
    expect(severeAlert?.source_type).toBe("observed");
    expect(severeAlert?.title).toContain("High Pollution Alert");
    expect(result.requiresPlanInvalidation).toBe(true);
  });

  it("Trigger 3: Handles missing CPCB criteria pollutants by providing pollutant-specific threshold advisories without fake AQI", () => {
    const result = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      sparseStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    expect(result.newAlerts.length).toBeGreaterThan(0);
    const pm25Alert = result.newAlerts.find((a) => a.pollutant === "PM2.5");
    expect(pm25Alert).toBeDefined();
    // Must NOT state a full NAQI score, but describe the specific parameter
    expect(pm25Alert?.message).toContain("PM2.5");
    expect(pm25Alert?.message).toContain("135");
    expect(pm25Alert?.aqi_value).toBeNull();
  });

  it("Section B: Freshness & Monitoring rejects stale readings (>24h) from triggering active alerts", () => {
    const result = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      staleStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    // Stale readings must not trigger active hazard alerts
    const activeHazardAlerts = result.newAlerts.filter(
      (a) => a.alert_type === "elevated_hazard" || a.alert_type === "category_deterioration"
    );
    expect(activeHazardAlerts.length).toBe(0);
  });

  it("Trigger 4: Forecast Advisory strictly labels modeled forecasts as FORECAST ADVISORY, not live observations", () => {
    // Current ground air is Moderate, but forecast projects Very Poor within 2-3h
    const result = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      moderateStationData,
      mockForecastData,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    const forecastAlert = result.newAlerts.find((a) => a.alert_type === "forecast_advisory");
    expect(forecastAlert).toBeDefined();
    expect(forecastAlert?.source_type).toBe("forecast");
    expect(forecastAlert?.title).toContain("Forecast Advisory");
    expect(forecastAlert?.source_name).toContain("Copernicus CAMS");
  });

  it("Trigger 5: Improvement & Resolution generates an all-clear resolution notice when air cleans up", () => {
    const activeSevereAlert: AirAlert = {
      id: "active-sev",
      user_id: "guest",
      fingerprint: "fp-severe",
      location_name: "Delhi Anand Vihar",
      alert_type: "elevated_hazard",
      severity: "Severe",
      title: "Active Severe Alert",
      message: "Conditions are severe",
      source_timestamp: new Date(Date.now() - 3600000).toISOString(),
      source_name: "Ground Station",
      source_type: "observed",
      status: "active",
      recommended_action: "Remain indoors",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    };

    // Now station readings improve to Good (AQI 45)
    const result = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      goodStationData,
      undefined,
      [activeSevereAlert],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    expect(result.resolvedAlertIds).toContain("active-sev");
    const improvementAlert = result.newAlerts.find((a) => a.alert_type === "improvement_resolved");
    expect(improvementAlert).toBeDefined();
    expect(improvementAlert?.title).toContain("Cleared");
  });

  it("Section K: Deduplication & Cooldown prevents duplicate alerts within the same hourly bucket", () => {
    const eval1 = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      severeStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );
    expect(eval1.newAlerts.length).toBeGreaterThan(0);
    const alert1 = eval1.newAlerts[0]!;

    // Evaluation 2: Re-evaluate 10 minutes later with identical conditions
    const eval2 = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      severeStationData,
      undefined,
      [alert1],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    // Should be deduplicated by fingerprint
    const duplicate = eval2.newAlerts.find((a) => a.fingerprint === alert1.fingerprint);
    expect(duplicate).toBeUndefined();
  });

  it("Section K: Escalation bypasses cooldown immediately when severity worsens", () => {
    const moderateAlert: AirAlert = {
      id: "mod-1",
      user_id: "guest",
      fingerprint: "delhi-anand-vihar_observed_threshold_moderate_aqi_2026-11-22-19",
      location_name: "Delhi Anand Vihar",
      alert_type: "observed_threshold",
      severity: "Moderate",
      title: "Moderate Air",
      message: "Moderate conditions",
      source_timestamp: new Date().toISOString(),
      source_name: "Ground Station",
      source_type: "observed",
      status: "active",
      recommended_action: "Ventilate midday",
      created_at: new Date().toISOString(),
    };

    // Evaluate under Severe conditions
    const evalResult = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      severeStationData,
      undefined,
      [moderateAlert],
      DEFAULT_NOTIFICATION_PREFERENCES
    );

    // Severe escalation must NOT be blocked by the existing moderate alert
    const severeAlert = evalResult.newAlerts.find((a) => a.severity === "Severe");
    expect(severeAlert).toBeDefined();
  });

  it("Section K: Quiet hours calculation properly identifies night periods and wraps around midnight", () => {
    const localMidnight = new Date();
    localMidnight.setHours(23, 30, 0, 0);
    expect(isWithinQuietHours(localMidnight, "22:00", "07:00")).toBe(true);

    const localEarlyMorning = new Date();
    localEarlyMorning.setHours(5, 30, 0, 0);
    expect(isWithinQuietHours(localEarlyMorning, "22:00", "07:00")).toBe(true);

    const localAfternoon = new Date();
    localAfternoon.setHours(14, 0, 0, 0);
    expect(isWithinQuietHours(localAfternoon, "22:00", "07:00")).toBe(false);
  });

  it("Section C: Provides personalized protective guidance for students, commuters, and seniors", () => {
    const studentResult = evaluateAirQualityAlerts(
      mockLocation,
      studentProfile,
      severeStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );
    const studentAlert = studentResult.newAlerts[0]!;
    expect(studentAlert.recommended_action).toContain("campus libraries");

    const commuterResult = evaluateAirQualityAlerts(
      mockLocation,
      commuterProfile,
      severeStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );
    const commuterAlert = commuterResult.newAlerts[0]!;
    expect(commuterAlert.recommended_action).toContain("mass transit");

    const seniorResult = evaluateAirQualityAlerts(
      mockLocation,
      seniorProfile,
      severeStationData,
      undefined,
      [],
      DEFAULT_NOTIFICATION_PREFERENCES
    );
    const seniorAlert = seniorResult.newAlerts[0]!;
    expect(seniorAlert.recommended_action).toContain("stretching or walking indoors");
    expect(seniorAlert.recommended_action).not.toContain("emergency room");
  });
});

describe("Phase 7: Notification UI Components", () => {
  it("NotificationCenterDrawer renders empty state when no alerts exist", () => {
    renderWithProviders(<NotificationCenterDrawer isOpen={true} onClose={() => {}} />);

    expect(screen.getByText("Notifications & Alerts")).toBeTruthy();
    expect(screen.getByText("All Clear")).toBeTruthy();
  });

  it("ActiveAlertBanner renders cleanly when mounted", () => {
    renderWithProviders(<ActiveAlertBanner />);

    // ActiveAlertBanner uses useAlerts hook, which returns null when no active alert is present
    expect(screen.queryByLabelText("Active air quality alert")).toBeNull();
  });
});
