import { Link } from "react-router-dom";
import { WindMark } from "@/components/ui/wind-lines";

export function Footer() {
  return (
    <footer className="border-t border-[#DCE2DC] bg-[#FAFAF7] text-[#526161]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-[#DCE2DC]/60">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-[#182323] mb-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-[#AFC8B5] bg-[#EAF1E9]">
                <WindMark className="h-3 w-3" />
              </div>
              <span className="font-editorial text-lg tracking-tight font-semibold">
                VayuVerse
              </span>
            </div>
            <p className="text-xs text-[#526161] max-w-md leading-relaxed">
              Personal AI Clean-Air Navigator for India. Built on empirical environmental observations from OpenAQ v3 monitoring stations, CPCB protocol standards, and explicitly labeled Open-Meteo forecasts.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <div className="text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-2.5">
              Intelligence
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/" className="hover:text-[#182323] transition-colors">
                  Overview Dashboard
                </Link>
              </li>
              <li>
                <Link to="/my-day" className="hover:text-[#182323] transition-colors">
                  My Day Planner
                </Link>
              </li>
              <li>
                <Link to="/decision-lab" className="hover:text-[#182323] transition-colors">
                  What-If Decision Lab
                </Link>
              </li>
              <li>
                <Link to="/indoor-air" className="hover:text-[#182323] transition-colors">
                  Indoor Air Guardian
                </Link>
              </li>
              <li>
                <Link to="/impact" className="hover:text-[#182323] transition-colors">
                  Impact Tracker
                </Link>
              </li>
            </ul>
          </div>

          {/* Data Principles */}
          <div>
            <div className="text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-2.5">
              Provenance
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/methodology" className="hover:text-[#182323] transition-colors">
                  Sources &amp; Methodology
                </Link>
              </li>
              <li>
                <a
                  href="https://openaq.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#182323] transition-colors"
                >
                  OpenAQ v3 API
                </a>
              </li>
              <li>
                <a
                  href="https://open-meteo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#182323] transition-colors"
                >
                  Open-Meteo Models
                </a>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#182323] transition-colors">
                  Profile &amp; Sensitivity Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} VayuVerse. PromptWars Virtual Challenge 6.
          </div>
          <div className="flex items-center gap-4 text-[#526161]">
            <span>Zero Simulated Data Guarantee</span>
            <span>•</span>
            <span>Indian NAQI Standard</span>
            <span>•</span>
            <span>AI Evidence Guardrails</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
