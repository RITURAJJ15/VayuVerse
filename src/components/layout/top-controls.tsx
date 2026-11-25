import { useState } from "react";
import { MapPin, User, ChevronDown, LogIn, ShieldCheck } from "lucide-react";
import { useLocationState } from "@/context/location-context";
import { useProfileState } from "@/context/profile-context";
import { useAuth } from "@/context/auth-context";
import { LocationSelectorDialog } from "@/components/location/location-selector-dialog";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { AuthModal } from "@/components/auth/auth-modal";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function TopControls() {
  const { currentLocation, setIsLocationSelectorOpen } = useLocationState();
  const { currentProfile, activePreset } = useProfileState();
  const { user, isGuest } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Simplified persona label for top-bar pill (e.g. "Student", "Commuter", "Parent")
  const personaShortLabel = activePreset
    ? activePreset.title.split(" ")[1] || activePreset.title.split(" ")[0]
    : currentProfile.displayName.split(" ")[0] || "User";

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-[#111111] select-none">
        {/* Location selector dropdown button */}
        <button
          onClick={() => setIsLocationSelectorOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#EDF6D5]/60 transition-colors font-medium cursor-pointer"
          aria-label="Select Indian location"
        >
          <MapPin className="h-4 w-4 text-[#111111]" />
          <span>{currentLocation?.name || "Select City"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#626762] ml-0.5" />
        </button>

        {/* Subtle vertical hairline divider */}
        <div className="h-4 w-[1px] bg-[#D6D6D2]" aria-hidden="true" />

        {/* Profile / Persona selector dropdown button */}
        <button
          onClick={() => setIsProfileOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#EDF6D5]/60 transition-colors font-medium cursor-pointer"
          aria-label="User Profile and Persona"
        >
          <User className="h-4 w-4 text-[#111111]" />
          <span>{personaShortLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#626762] ml-0.5" />
        </button>

        {/* Real-Time Air Alert Notification Bell */}
        <NotificationBell />

        {/* Subtle vertical hairline divider */}
        <div className="h-4 w-[1px] bg-[#D6D6D2]" aria-hidden="true" />

        {/* Authentication State Button */}
        {isGuest ? (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDF6D5] hover:bg-[#D1EB8F] transition-colors text-xs font-bold text-[#111111] cursor-pointer shadow-2xs"
            aria-label="Sign in"
          >
            <LogIn className="h-3.5 w-3.5 text-[#111111]" />
            <span>Sign In</span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#D6D6D2] hover:bg-[#FAFAF8] transition-colors text-xs font-semibold text-[#111111] cursor-pointer"
            aria-label="Account settings"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D4E]" />
            <span className="max-w-[100px] truncate">
              {user?.user_metadata?.full_name?.split(" ")[0] || "Account"}
            </span>
          </button>
        )}
      </div>

      {/* Global Location, Profile & Auth Dialogs */}
      <LocationSelectorDialog />
      <ProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
