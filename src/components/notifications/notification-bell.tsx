import { useState } from "react";
import { Bell } from "lucide-react";
import { useAlerts } from "@/hooks/use-alerts";
import { NotificationCenterDrawer } from "./notification-center-drawer";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useAlerts();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center h-8.5 w-8.5 rounded-lg text-[#111111] hover:bg-[#EDF6D5]/60 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2E7D4E]"
        aria-label={`Air quality notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4 text-[#111111]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#EDF6D5] text-[10px] font-bold text-[#285A1D] border border-[#D1EB8F] shadow-2xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenterDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
