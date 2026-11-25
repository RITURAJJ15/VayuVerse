import { useState } from "react";
import { Bell, Moon, Check, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useAlerts } from "@/hooks/use-alerts";
import { alertService } from "@/lib/alert-service";
import {
  requestBrowserNotificationPermission,
  subscribeToWebPush,
  getNotificationPermission,
} from "@/lib/browser-notifications";
import type { AirAlertSeverity, NotificationPreferences } from "@/types/alerts";

const SEVERITY_OPTIONS: AirAlertSeverity[] = [
  "Moderate",
  "Poor",
  "Very Poor",
  "Severe",
];

export function AlertPreferencesCard() {
  const { user } = useAuth();
  const { preferences, refetchAlerts } = useAlerts();

  const [form, setForm] = useState<NotificationPreferences>(preferences);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() =>
    getNotificationPermission()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);

  const handleBrowserToggle = async (checked: boolean) => {
    setBrowserError(null);
    if (!checked) {
      setForm((prev) => ({ ...prev, browser_notifications_enabled: false }));
      return;
    }

    // Explicit opt-in required by Section F
    const permission = await requestBrowserNotificationPermission();
    setPermissionState(permission);

    if (permission !== "granted") {
      setBrowserError(
        "Notification permission was denied. Please allow notifications in your browser site permissions to receive in-session alerts."
      );
      setForm((prev) => ({ ...prev, browser_notifications_enabled: false }));
      return;
    }

    // Try web push subscription
    const pushResult = await subscribeToWebPush(user?.id || "guest");
    if (!pushResult.success) {
      console.info("[WebPush Notice]", pushResult.message);
    }

    setForm((prev) => ({ ...prev, browser_notifications_enabled: true }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await alertService.savePreferences(form, user?.id);
      setSaveSuccess(true);
      refetchAlerts();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save alert preferences:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border-[#D6D6D2] bg-white shadow-xs overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D6D6D2]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#285A1D]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">
                Real-Time Air Quality Alerts &amp; Notifications
              </h3>
              <p className="text-xs text-[#626762]">
                Configure sensitivity thresholds, in-session notifications, and quiet hours.
              </p>
            </div>
          </div>
          <Badge
            variant={form.enabled ? "sage" : "outline"}
            className="text-xs rounded-lg"
          >
            {form.enabled ? "Active" : "Paused"}
          </Badge>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Master Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8]">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#111111] block">
                Enable Alert Engine
              </span>
              <span className="text-xs text-[#626762] block">
                Monitors OpenAQ ground telemetry and CAMS dispersion for changes.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="sr-only peer"
                aria-label="Toggle alert engine"
              />
              <div className="w-11 h-6 bg-[#D6D6D2] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E7D4E]"></div>
            </label>
          </div>

          {/* Minimum Severity Dropdown */}
          <div className="space-y-2">
            <label
              htmlFor="minimum-severity"
              className="text-xs font-bold text-[#111111] uppercase tracking-wider block"
            >
              Minimum Alert Severity
            </label>
            <p className="text-xs text-[#626762]">
              You will only be alerted when atmospheric conditions reach or exceed this level.
            </p>
            <select
              id="minimum-severity"
              value={form.minimum_severity}
              onChange={(e) =>
                setForm({
                  ...form,
                  minimum_severity: e.target.value as AirAlertSeverity,
                })
              }
              className="w-full sm:w-72 rounded-xl border border-[#D6D6D2] bg-white px-3.5 py-2.5 text-sm text-[#111111] focus:outline-hidden focus:ring-2 focus:ring-[#2E7D4E]"
            >
              {SEVERITY_OPTIONS.map((sev) => (
                <option key={sev} value={sev}>
                  {sev} (and worse)
                </option>
              ))}
            </select>
          </div>

          {/* Browser Notifications Toggle */}
          <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-[#111111] block">
                  Browser In-Session Notifications
                </span>
                <span className="text-xs text-[#626762] block">
                  Receive gentle desktop alerts during open dashboard sessions. No startling alarms.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.browser_notifications_enabled}
                  onChange={(e) => handleBrowserToggle(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Toggle browser notifications"
                />
                <div className="w-11 h-6 bg-[#D6D6D2] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E7D4E]"></div>
              </label>
            </div>

            {/* Permission badge note */}
            <div className="flex items-center gap-2 text-xs text-[#626762]">
              <span>System permission state:</span>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                {permissionState}
              </Badge>
            </div>

            {/* Explicit Disclosure on Closed-Browser Push (Requirement 9) */}
            <div className="pt-2 border-t border-[#D6D6D2]/60 flex items-center justify-between text-[11px] text-[#626762] flex-wrap gap-1">
              <span>Closed-browser push delivery:</span>
              <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Unavailable (Requires scheduled backend runner)
              </span>
            </div>

            {browserError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{browserError}</span>
              </div>
            )}
          </div>

          {/* Quiet Hours */}
          <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-[#111111]" />
              <span className="text-sm font-bold text-[#111111]">Quiet Hours</span>
            </div>
            <p className="text-xs text-[#626762]">
              Non-critical alerts are silenced during this period. Severe or hazardous conditions still notify you.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                  Starts at
                </label>
                <input
                  type="time"
                  value={form.quiet_hours_start}
                  onChange={(e) =>
                    setForm({ ...form, quiet_hours_start: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#D6D6D2] bg-white px-3 py-2 text-sm text-[#111111]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                  Ends at
                </label>
                <input
                  type="time"
                  value={form.quiet_hours_end}
                  onChange={(e) =>
                    setForm({ ...form, quiet_hours_end: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#D6D6D2] bg-white px-3 py-2 text-sm text-[#111111]"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#111111] hover:bg-[#2E7D4E] text-white font-bold px-6 py-2 rounded-xl transition-colors cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>

            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#285A1D]">
                <Check className="h-4 w-4" />
                Preferences updated successfully
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
