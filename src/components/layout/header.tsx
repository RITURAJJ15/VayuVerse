import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MapPin, User, Menu, X, ChevronDown } from "lucide-react";
import { WindMark } from "@/components/ui/wind-lines";
import { useLocationState } from "@/context/location-context";
import { useProfileState } from "@/context/profile-context";
import { LocationSelectorDialog } from "@/components/location/location-selector-dialog";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { label: "Overview", href: "/dashboard" },
  { label: "My Day", href: "/my-day" },
  { label: "Decision Lab", href: "/decision-lab" },
  { label: "Indoor Air", href: "/indoor-air" },
  { label: "Impact", href: "/impact" },
  { label: "Methodology", href: "/methodology" },
] as const;

export function Header() {
  const { pathname } = useLocation();
  const { currentLocation, setIsLocationSelectorOpen } = useLocationState();
  const { currentProfile, activePreset } = useProfileState();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#DCE2DC] bg-[#FAFAF7]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-8">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 text-[#182323] hover:opacity-90 transition-opacity group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[#AFC8B5] bg-[#EAF1E9] text-[#182323] transition-colors group-hover:bg-[#AFC8B5]">
                <WindMark className="h-4 w-4" />
              </div>
              <span className="font-editorial text-xl sm:text-2xl tracking-tight text-[#182323] font-semibold">
                VayuVerse
              </span>
            </Link>

            {/* Desktop Horizontal Navigation (Soft Swiss Minimalism) */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-colors rounded-[3px]",
                      isActive
                        ? "bg-[#EAF1E9] text-[#182323] font-semibold border border-[#DCE2DC]"
                        : "text-[#526161] hover:text-[#182323] hover:bg-[#EAF1E9]/50"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Cluster: Location Selector + User Profile Selector */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Indian Location Selector Pill Button */}
            <button
              onClick={() => setIsLocationSelectorOpen(true)}
              className="flex items-center gap-1.5 rounded-[4px] border border-[#DCE2DC] bg-white px-2.5 sm:px-3 py-1.5 text-xs text-[#182323] hover:bg-[#EAF1E9]/60 hover:border-[#AFC8B5] transition-all shadow-[0_1px_2px_rgba(24,35,35,0.02)]"
              aria-label="Change Indian location"
            >
              <MapPin className="h-3.5 w-3.5 text-[#526161]" />
              <span className="max-w-[110px] sm:max-w-[160px] truncate font-medium">
                {currentLocation ? currentLocation.name : "Select City"}
              </span>
              <span className="text-[10px] text-[#526161] hidden sm:inline">IN</span>
              <ChevronDown className="h-3 w-3 text-[#526161]" />
            </button>

            {/* User Profile Selector (Guest Mode / Active Persona) */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 rounded-[4px] border border-[#DCE2DC] bg-[#EAF1E9] px-2.5 sm:px-3 py-1.5 text-xs text-[#182323] hover:bg-[#AFC8B5] transition-colors"
              aria-label="User Profile & Sensitivity Settings"
            >
              <User className="h-3.5 w-3.5 text-[#182323]" />
              <span className="text-xs font-medium hidden sm:inline max-w-[120px] truncate">
                {activePreset ? activePreset.title.split(" ")[0] : currentProfile.displayName}
              </span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#DCE2DC] bg-white text-[#182323]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-[#DCE2DC] bg-[#FAFAF7] px-4 py-3 md:hidden animate-fade-in">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-xs font-medium tracking-wide uppercase rounded-[3px]",
                      isActive
                        ? "bg-[#EAF1E9] text-[#182323] font-semibold border border-[#DCE2DC]"
                        : "text-[#526161] hover:bg-white hover:text-[#182323]"
                    )}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#182323]" />}
                  </Link>
                );
              })}
              <div className="mt-2 pt-2 border-t border-[#DCE2DC] flex justify-between items-center text-xs text-[#526161]">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-[#182323]"
                >
                  Profile & Settings
                </Link>
                <span className="text-[10px] text-[#2E7D4E]">OpenAQ Verified</span>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Global Dialogs */}
      <LocationSelectorDialog />
      <ProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
