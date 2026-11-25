import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocationState } from "@/context/location-context";
import { useProfileState } from "@/context/profile-context";
import { useAuth } from "@/context/auth-context";
import { useAirQuality } from "@/hooks/use-air-quality";
import { useForecast } from "@/hooks/use-forecast";
import {
  evaluateAirQualityAlerts,
  DEFAULT_NOTIFICATION_PREFERENCES,
  isWithinQuietHours,
} from "@/lib/alert-engine";
import { alertService } from "@/lib/alert-service";
import { sendInSessionNotification } from "@/lib/browser-notifications";
import type { AirAlert, NotificationPreferences } from "@/types/alerts";

// Initial polling interval: 15 minutes (900,000 ms)
const DEFAULT_POLL_INTERVAL_MS = 15 * 60 * 1000;

export function useAlerts() {
  const queryClient = useQueryClient();
  const { currentLocation } = useLocationState();
  const { currentProfile } = useProfileState();
  const { user } = useAuth();

  const { data: aqData } = useAirQuality(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  const { data: forecastData } = useForecast(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  const [dismissedBannerIds, setDismissedBannerIds] = useState<Record<string, boolean>>({});
  const [planUpdatedNotice, setPlanUpdatedNotice] = useState<string | null>(null);

  // 1. Fetch persistent user notification preferences
  const { data: preferences = DEFAULT_NOTIFICATION_PREFERENCES } = useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences", user?.id],
    queryFn: () => alertService.fetchPreferences(user?.id),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch alert history from database/localStorage
  const {
    data: alerts = [],
    refetch: refetchAlerts,
    isLoading: isAlertsLoading,
  } = useQuery<AirAlert[]>({
    queryKey: ["air-alerts", user?.id],
    queryFn: () => alertService.fetchAlerts(user?.id),
    staleTime: 60 * 1000,
  });

  const lastEvalRef = useRef<number>(0);

  // 3. Periodic Alert Evaluation Engine
  useEffect(() => {
    if (!currentLocation || !preferences.enabled) return;

    // Throttle evaluation to at most once every 60 seconds
    const now = Date.now();
    if (now - lastEvalRef.current < 60 * 1000) return;
    lastEvalRef.current = now;

    const evaluation = evaluateAirQualityAlerts(
      currentLocation,
      currentProfile,
      aqData,
      forecastData,
      alerts,
      preferences,
      new Date()
    );

    // Persist new alerts if any triggered
    if (evaluation.newAlerts.length > 0) {
      alertService.persistNewAlerts(evaluation.newAlerts, user?.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["air-alerts", user?.id] });
      });

      // Send browser notification if enabled
      if (preferences.browser_notifications_enabled) {
        for (const alert of evaluation.newAlerts) {
          const isQuiet = isWithinQuietHours(
            new Date(),
            preferences.quiet_hours_start,
            preferences.quiet_hours_end
          );
          // Only send during quiet hours if alert is Severe or Very Poor
          if (!isQuiet || alert.severity === "Severe" || alert.severity === "Very Poor") {
            sendInSessionNotification(alert.title, {
              body: `${alert.severity} • ${alert.location_name}: ${alert.message}`,
              tag: alert.fingerprint,
              data: { alertId: alert.id },
            });
          }
        }
      }
    }

    // Resolve resolved alerts
    if (evaluation.resolvedAlertIds.length > 0) {
      for (const id of evaluation.resolvedAlertIds) {
        alertService.updateAlertStatus(id, "resolved", user?.id);
      }
      queryClient.invalidateQueries({ queryKey: ["air-alerts", user?.id] });
    }

    // Plan invalidation signal
    if (evaluation.requiresPlanInvalidation && evaluation.invalidationReason) {
      const reason = evaluation.invalidationReason;
      queueMicrotask(() => {
        setPlanUpdatedNotice(reason);
      });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["saved-plans"] });
    }
  }, [
    currentLocation,
    currentProfile,
    aqData,
    forecastData,
    alerts,
    preferences,
    user?.id,
    queryClient,
  ]);

  // Set up background polling timer (15 minutes)
  useEffect(() => {
    if (!preferences.enabled) return;
    const interval = setInterval(() => {
      refetchAlerts();
    }, DEFAULT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [preferences.enabled, refetchAlerts]);

  // Actions
  const markAsRead = useCallback(
    async (alertId: string) => {
      await alertService.updateAlertStatus(alertId, "read", user?.id);
      queryClient.invalidateQueries({ queryKey: ["air-alerts", user?.id] });
    },
    [user?.id, queryClient]
  );

  const markAllAsRead = useCallback(async () => {
    await alertService.markAllAlertsAsRead(user?.id);
    queryClient.invalidateQueries({ queryKey: ["air-alerts", user?.id] });
  }, [user?.id, queryClient]);

  const dismissAlert = useCallback(
    async (alertId: string) => {
      await alertService.updateAlertStatus(alertId, "dismissed", user?.id);
      setDismissedBannerIds((prev) => ({ ...prev, [alertId]: true }));
      queryClient.invalidateQueries({ queryKey: ["air-alerts", user?.id] });
    },
    [user?.id, queryClient]
  );

  const dismissBanner = useCallback((alertId: string) => {
    setDismissedBannerIds((prev) => ({ ...prev, [alertId]: true }));
  }, []);

  // Compute unread count
  const unreadCount = useMemo(() => {
    return alerts.filter((a) => a.status === "active").length;
  }, [alerts]);

  // Active banner alert (highest priority active alert that has not been dismissed)
  const activeBannerAlert = useMemo(() => {
    const activeList = alerts.filter(
      (a) => a.status === "active" && !dismissedBannerIds[a.id]
    );
    if (activeList.length === 0) return null;

    // Rank severity
    const rankOrder: Record<string, number> = {
      Severe: 6,
      "Very Poor": 5,
      Poor: 4,
      Moderate: 3,
      Satisfactory: 2,
      Good: 1,
    };

    return [...activeList].sort((a, b) => (rankOrder[b.severity] || 0) - (rankOrder[a.severity] || 0))[0] || null;
  }, [alerts, dismissedBannerIds]);

  return {
    alerts,
    unreadCount,
    activeBannerAlert,
    preferences,
    isLoading: isAlertsLoading,
    planUpdatedNotice,
    clearPlanUpdatedNotice: () => setPlanUpdatedNotice(null),
    markAsRead,
    markAllAsRead,
    dismissAlert,
    dismissBanner,
    refetchAlerts,
  };
}

