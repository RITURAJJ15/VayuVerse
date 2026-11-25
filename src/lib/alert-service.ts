import { supabase } from "./supabase";
import type { AirAlert, NotificationPreferences, AlertStatus } from "@/types/alerts";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./alert-engine";

const ALERTS_STORAGE_KEY_PREFIX = "vayuverse_alerts_v1_";
const PREFS_STORAGE_KEY_PREFIX = "vayuverse_notif_prefs_v1_";

function getLocalAlerts(userId?: string | null): AirAlert[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const key = `${ALERTS_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAlerts(alerts: AirAlert[], userId?: string | null) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = `${ALERTS_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    window.localStorage.setItem(key, JSON.stringify(alerts.slice(0, 50)));
  } catch {
    // ignore
  }
}

function getLocalPreferences(userId?: string | null): NotificationPreferences {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, user_id: userId || "guest" };
  }
  try {
    const key = `${PREFS_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { ...DEFAULT_NOTIFICATION_PREFERENCES, user_id: userId || "guest" };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, user_id: userId || "guest" };
  }
}

function saveLocalPreferences(prefs: NotificationPreferences, userId?: string | null) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = `${PREFS_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export const alertService = {
  // ----------------- Alert Fetching & Sync -----------------
  async fetchAlerts(userId?: string | null): Promise<AirAlert[]> {
    const local = getLocalAlerts(userId);

    if (userId) {
      try {
        const { data, error } = await supabase
          .from("air_alerts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data) {
          const dbAlerts: AirAlert[] = data.map((d) => ({
            id: d.id,
            user_id: d.user_id,
            location_id: d.location_id,
            location_name: d.source_name || "Saved Area",
            alert_type: d.alert_type as AirAlert["alert_type"],
            severity: d.severity as AirAlert["severity"],
            status: d.status as AlertStatus,
            source_type: d.source_type as AirAlert["source_type"],
            pollutant: d.pollutant,
            observed_value: d.observed_value,
            aqi_value: d.aqi_value,
            source_timestamp: d.source_timestamp,
            source_name: d.source_name,
            title: d.title,
            message: d.message,
            recommended_action: d.recommended_action,
            fingerprint: d.fingerprint,
            created_at: d.created_at,
            resolved_at: d.resolved_at,
          }));

          // Merge db and local, keeping DB as authoritative
          const map = new Map<string, AirAlert>();
          for (const a of local) map.set(a.fingerprint, a);
          for (const a of dbAlerts) map.set(a.fingerprint, a);

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          saveLocalAlerts(merged, userId);
          return merged;
        }
      } catch (err) {
        console.warn("[AlertService] DB fetch error, using local:", err);
      }
    }

    return local;
  },

  // ----------------- Save New Alerts Idempotently -----------------
  async persistNewAlerts(alerts: AirAlert[], userId?: string | null): Promise<AirAlert[]> {
    if (alerts.length === 0) return [];

    const current = getLocalAlerts(userId);
    const updated = [...alerts, ...current.filter((c) => !alerts.some((a) => a.fingerprint === c.fingerprint))];
    saveLocalAlerts(updated, userId);

    // Note: Direct client REST insertions into public.air_alerts are restricted by database RLS
    // and PostgreSQL privileges to prevent telemetry forgery. Authoritative alerts are inserted
    // via trusted server-side ingestion (service_role). The client maintains local storage
    // for zero-latency active session alerts.
    return updated;
  },

  // ----------------- Update Alert Status (Read/Dismiss/Resolve) -----------------
  async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    userId?: string | null
  ): Promise<void> {
    const current = getLocalAlerts(userId);
    const updated = current.map((a) => {
      if (a.id === alertId) {
        return {
          ...a,
          status,
          resolved_at: status === "resolved" ? new Date().toISOString() : a.resolved_at,
        };
      }
      return a;
    });
    saveLocalAlerts(updated, userId);

    if (userId) {
      // Authenticated users are permitted to update status to 'read' or 'dismissed'.
      // Environmental resolution (status = 'resolved') is server-authoritative and not client-writable.
      if (status === "read" || status === "dismissed") {
        try {
          await supabase
            .from("air_alerts")
            .update({ status })
            .eq("id", alertId)
            .eq("user_id", userId);
        } catch (err) {
          console.warn("[AlertService] Update alert status error:", err);
        }
      }
    }
  },

  // ----------------- Mark All Alerts as Read -----------------
  async markAllAlertsAsRead(userId?: string | null): Promise<void> {
    const current = getLocalAlerts(userId);
    const updated = current.map((a) => (a.status === "active" ? { ...a, status: "read" as AlertStatus } : a));
    saveLocalAlerts(updated, userId);

    if (userId) {
      try {
        await supabase
          .from("air_alerts")
          .update({ status: "read" })
          .eq("user_id", userId)
          .eq("status", "active");
      } catch (err) {
        console.warn("[AlertService] Mark all read error:", err);
      }
    }
  },

  // ----------------- Notification Preferences -----------------
  async fetchPreferences(userId?: string | null): Promise<NotificationPreferences> {
    const local = getLocalPreferences(userId);
    if (!userId) return local;

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        const fetched: NotificationPreferences = {
          user_id: data.user_id,
          enabled: data.enabled,
          browser_notifications_enabled: data.browser_notifications_enabled,
          minimum_severity: data.minimum_severity as NotificationPreferences["minimum_severity"],
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          timezone: data.timezone,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        saveLocalPreferences(fetched, userId);
        return fetched;
      }
    } catch (err) {
      console.warn("[AlertService] Fetch preferences error:", err);
    }

    return local;
  },

  async savePreferences(
    prefs: NotificationPreferences,
    userId?: string | null
  ): Promise<NotificationPreferences> {
    saveLocalPreferences(prefs, userId);
    if (!userId) return prefs;

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            enabled: prefs.enabled,
            browser_notifications_enabled: prefs.browser_notifications_enabled,
            minimum_severity: prefs.minimum_severity,
            quiet_hours_start: prefs.quiet_hours_start,
            quiet_hours_end: prefs.quiet_hours_end,
            timezone: prefs.timezone,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (!error && data) {
        return {
          user_id: data.user_id,
          enabled: data.enabled,
          browser_notifications_enabled: data.browser_notifications_enabled,
          minimum_severity: data.minimum_severity as NotificationPreferences["minimum_severity"],
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          timezone: data.timezone,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch (err) {
      console.warn("[AlertService] Save preferences error:", err);
    }

    return prefs;
  },
};

