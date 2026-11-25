import type { NaqiCategory } from "@/lib/daily-planning-engine";

export type AirAlertSeverity = NaqiCategory;

export type AirAlertType =
  | "observed_threshold"
  | "category_deterioration"
  | "elevated_hazard"
  | "forecast_advisory"
  | "scheduled_activity_risk"
  | "improvement_resolved";

export type AlertStatus = "active" | "read" | "dismissed" | "resolved";

export type AlertSourceType = "observed" | "forecast" | "data_unavailable";

export interface AirAlert {
  id: string;
  user_id: string;
  location_id?: string | null;
  location_name: string;
  alert_type: AirAlertType;
  severity: AirAlertSeverity;
  status: AlertStatus;
  source_type: AlertSourceType;
  pollutant?: string | null; // e.g. "PM2.5", "PM10", "AQI"
  observed_value?: number | null;
  aqi_value?: number | null;
  source_timestamp: string; // ISO string
  source_name: string; // e.g. "Anand Vihar CAAQMS" or "Copernicus CAMS Model"
  title: string;
  message: string;
  recommended_action: string;
  fingerprint: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface NotificationPreferences {
  user_id: string;
  enabled: boolean;
  browser_notifications_enabled: boolean;
  minimum_severity: AirAlertSeverity;
  quiet_hours_start: string; // e.g. "22:00"
  quiet_hours_end: string; // e.g. "07:00"
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export interface PushSubscriptionRecord {
  id?: string;
  user_id: string;
  endpoint: string;
  subscription_data: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  created_at?: string;
}

export interface AlertEvaluationContext {
  newAlerts: AirAlert[];
  resolvedAlertIds: string[];
  requiresPlanInvalidation: boolean;
  invalidationReason?: string;
  activeBannerAlert: AirAlert | null;
}
