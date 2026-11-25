import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Sidebar, ApprovedVayuMark } from "./sidebar";
import { TopControls } from "./top-controls";

/**
 * Top-level Page Shell matching Image 1 approved design:
 * - Fixed left vertical sidebar on desktop
 * - Top-right location & persona controls
 * - Compact slide-over navigation drawer on mobile
 */
export function PageShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FAFAF8] text-[#111111]">
      {/* 1. Desktop Fixed Left Sidebar */}
      <div className="hidden md:block fixed inset-y-0 left-0 w-60 z-30">
        <Sidebar className="w-60 h-full" />
      </div>

      {/* 2. Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#111111]/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer Content */}
          <div className="relative flex flex-col w-64 max-w-[80%] h-full bg-[#FAFAF8] shadow-xl z-10 animate-fade-in">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[#D6D6D2]">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <ApprovedVayuMark className="text-[#111111]" />
                <span className="font-bold text-lg text-[#111111]">VayuVerse</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-[#111111] hover:bg-[#EDF6D5]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onNavClick={() => setMobileMenuOpen(false)} className="border-r-0 flex-1" />
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-60">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between px-4 sm:px-8 bg-[#FAFAF8]/90 backdrop-blur-xs border-b border-[#D6D6D2]/60">
          {/* Mobile hamburger & brand */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] hover:bg-[#EDF6D5]"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/" className="flex items-center gap-1.5">
              <ApprovedVayuMark className="text-[#111111]" />
              <span className="font-bold text-base text-[#111111]">VayuVerse</span>
            </Link>
          </div>

          {/* Desktop Spacer to push controls right */}
          <div className="hidden md:block" />

          {/* Right Action Cluster: Location + Persona Controls */}
          <TopControls />
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
