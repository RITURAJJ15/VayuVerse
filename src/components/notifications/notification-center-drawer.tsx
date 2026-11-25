import { createPortal } from "react-dom";
import {
  Bell,
  X,
  ArrowRight,
  ShieldCheck,
  Check,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAlerts } from "@/hooks/use-alerts";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { Button } from "@/components/ui/button";
import type { AirAlert, AirAlertSeverity } from "@/types/alerts";

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SEVERITY_CONFIG: Record<
  AirAlertSeverity,
  {
    borderLeft: string;
    border: string;
    bg: string;
    badge: string;
    text: string;
  }
> = {
  Severe: {
    borderLeft: "border-l-[#DC2626]",
    border: "border-[#FECACA]",
    bg: "bg-[#FEF2F2]/60",
    badge: "bg-[#DC2626] text-white",
    text: "text-[#991B1B]",
  },
  "Very Poor": {
    borderLeft: "border-l-[#EA580C]",
    border: "border-[#FFEDD5]",
    bg: "bg-[#FFF7ED]/60",
    badge: "bg-[#EA580C] text-white",
    text: "text-[#C2410C]",
  },
  Poor: {
    borderLeft: "border-l-[#D97706]",
    border: "border-[#FEF3C7]",
    bg: "bg-[#FEFCE8]/60",
    badge: "bg-[#D97706] text-white",
    text: "text-[#B45309]",
  },
  Moderate: {
    borderLeft: "border-l-[#CA8A04]",
    border: "border-[#FEF9C3]",
    bg: "bg-[#FEF9C3]/40",
    badge: "bg-[#CA8A04] text-white",
    text: "text-[#854D0E]",
  },
  Satisfactory: {
    borderLeft: "border-l-[#16A34A]",
    border: "border-[#DCFCE7]",
    bg: "bg-[#F0FDF4]/60",
    badge: "bg-[#16A34A] text-white",
    text: "text-[#166534]",
  },
  Good: {
    borderLeft: "border-l-[#2E7D4E]",
    border: "border-[#D1EB8F]",
    bg: "bg-[#EDF6D5]/60",
    badge: "bg-[#2E7D4E] text-white",
    text: "text-[#285A1D]",
  },
};

export function NotificationCenterDrawer({ isOpen, onClose }: NotificationCenterDrawerProps) {
  const { alerts, unreadCount, markAsRead, markAllAsRead, dismissAlert } = useAlerts();

  // Accessible focus trap, body scroll lock, and escape key listener
  const { modalContainerRef } = useModalA11y({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const panelContent = (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
    >
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Notification Pop-Up Panel (Anchored top-right on desktop, full-width on mobile) */}
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="fixed top-16 right-3 sm:right-6 lg:right-8 z-[101] w-[calc(100vw-1.5rem)] sm:w-[440px] max-h-[calc(100vh-5rem)] h-[620px] flex flex-col rounded-2xl bg-white border border-[#D6D6D2] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden focus:outline-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-[#E5E5E0] bg-[#FAFAF8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#285A1D] shadow-2xs">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="notification-center-title" className="text-sm font-bold text-[#111111]">
                  Notifications &amp; Alerts
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#EDF6D5] text-[#285A1D] border border-[#D1EB8F]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#626762]">
                Environmental telemetry and personalized guidance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-xs font-semibold text-[#2E7D4E] hover:bg-[#EDF6D5] h-8 px-2.5 rounded-lg cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#626762] hover:text-[#111111] hover:bg-[#EAEAE5] transition-colors cursor-pointer"
              aria-label="Close notification center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Panel Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAFAF8]">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3.5 text-[#626762]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDF6D5] text-[#285A1D] shadow-2xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">All Clear</h3>
                <p className="text-xs text-[#626762] mt-1 max-w-xs leading-relaxed">
                  No active atmospheric warnings. Ambient conditions are within normal limits for your selected location.
                </p>
              </div>
            </div>
          ) : (
            alerts.map((alert: AirAlert) => {
              const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.Moderate;
              const isUnread = alert.status === "active";
              const isForecast = alert.source_type === "forecast";

              return (
                <article
                  key={alert.id}
                  className={`rounded-xl border border-l-4 p-4 transition-all shadow-xs bg-white ${config.borderLeft} ${
                    isUnread ? config.bg : "border-[#E5E5E0]"
                  }`}
                >
                  {/* Top Row: Severity Tag, Source, Unread Indicator, Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${config.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isForecast
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {isForecast ? "FORECAST ADVISORY" : "OBSERVED ALERT"}
                      </span>
                      {isUnread && (
                        <span
                          className="h-2 w-2 rounded-full bg-[#2E7D4E]"
                          title="Unread alert"
                          aria-label="Unread alert"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#626762] font-medium">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(alert.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Location & Alert Title */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#626762]">
                      <MapPin className="h-3 w-3" />
                      <span>{alert.location_name}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111111] leading-snug">
                      {alert.title}
                    </h4>
                  </div>

                  {/* Atmospheric Evidence Description */}
                  <p className="text-xs text-[#333333] leading-relaxed mb-3">
                    {alert.message}
                  </p>

                  {/* Personalized Action Callout Box */}
                  {alert.recommended_action && (
                    <div className="rounded-lg bg-white/95 border border-[#D6D6D2] p-2.5 mb-3 text-xs text-[#111111] shadow-2xs leading-relaxed">
                      <strong className="text-[#285A1D] block mb-0.5 text-[11px] uppercase tracking-wide">
                        Recommended Protective Action:
                      </strong>
                      <span>{alert.recommended_action}</span>
                    </div>
                  )}

                  {/* Footer Controls: Navigation Links & Mark/Dismiss */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E5E0] flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Link
                        to="/my-day"
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#285A1D] bg-[#EDF6D5] hover:bg-[#D1EB8F] px-2.5 py-1 rounded-md transition-colors"
                      >
                        <span>Adjust Plan</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                      <Link
                        to="/indoor-air"
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#626762] hover:text-[#111111] hover:underline px-1 py-1"
                      >
                        <span>Indoor Air</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markAsRead(alert.id)}
                          className="text-[11px] font-semibold text-[#2E7D4E] hover:underline cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-[11px] font-medium text-[#777777] hover:text-[#111111] cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Panel Footer */}
        <div className="px-4 py-2.5 border-t border-[#E5E5E0] bg-white flex items-center justify-between text-[11px] text-[#626762] shrink-0">
          <span>Telemetry: Verified CAAQMS &amp; CAMS Model</span>
          <Link
            to="/methodology"
            onClick={onClose}
            className="text-[11px] font-semibold text-[#2E7D4E] hover:underline"
          >
            Methodology
          </Link>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return panelContent;
  }

  return createPortal(panelContent, document.body);
}
