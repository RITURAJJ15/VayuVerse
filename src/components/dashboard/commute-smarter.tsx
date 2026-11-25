import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Train, MapPin, ArrowRight, ShieldCheck, PlusCircle } from "lucide-react";
import { useProfileState } from "@/context/profile-context";
import { useAuth } from "@/context/auth-context";
import { fetchSavedCommutes, type SavedCommute } from "@/lib/saved-commutes";

export function CommuteSmarterCard() {
  const { currentProfile } = useProfileState();
  const { user } = useAuth();
  const [savedCommutes, setSavedCommutes] = useState<SavedCommute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const list = await fetchSavedCommutes(user?.id);
        if (isMounted) {
          setSavedCommutes(list || []);
        }
      } catch (err) {
        console.warn("[CommuteSmarter] Failed to load saved commutes:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const activeCommute = savedCommutes[0];

  // Destination label
  const destinationLabel =
    activeCommute?.destination_name ||
    (currentProfile.category === "college_student"
      ? "College Campus"
      : currentProfile.category === "office_commuter"
      ? "Workplace"
      : "Daily Destination");

  const originLabel = activeCommute?.origin_name || "Home";

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs flex flex-col justify-between h-full">
      <div className="space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Train className="h-5 w-5 text-[#111111]" />
            <h3 className="text-xl font-bold tracking-tight text-[#111111]">
              Commute smarter
            </h3>
          </div>
          <p className="text-xs text-[#626762]">
            Route-level air exposure navigation and modal comparison.
          </p>
        </div>

        {/* Content State: Saved Route vs. Unconfigured */}
        {!isLoading && !activeCommute ? (
          // UNCONFIGURED STATE — Eliminates fabricated 42 min / 40%
          <div className="rounded-xl border border-dashed border-[#D6D6D2] bg-[#FAFAF8] p-5 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF6D5] text-[#2E7D4E]">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[#111111]">
                No Commute Route Configured
              </h4>
              <p className="text-xs text-[#626762] max-w-sm mx-auto leading-relaxed">
                Configure your daily commute in Decision Lab to calculate real route-level exposure and discover cleaner transit alternatives.
              </p>
            </div>
            <div className="pt-1">
              <Link
                to="/decision-lab"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EDF6D5] hover:bg-[#D1EB8F] text-[#111111] text-xs font-semibold border border-[#D6D6D2] transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Set up Commute</span>
              </Link>
            </div>
          </div>
        ) : (
          // CONFIGURED SAVED ROUTE
          <div className="space-y-4">
            <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#111111]">
                  {activeCommute?.route_nickname || "Daily Commute Route"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white border border-[#D6D6D2] text-[10px] text-[#626762] capitalize">
                  Mode: {activeCommute?.travel_mode || currentProfile.commuteMode}
                </span>
              </div>

              {/* Route Path Schematic Illustration */}
              <div className="flex items-center justify-between px-2 py-1 text-xs text-[#111111]">
                {/* Origin */}
                <div className="flex items-center gap-1.5 font-medium max-w-[40%] truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#2E7D4E] shrink-0" />
                  <span className="truncate">{originLabel}</span>
                </div>

                {/* Curved dashed route line */}
                <div className="flex-1 mx-3 relative flex items-center justify-center">
                  <svg
                    className="w-full h-6 overflow-visible"
                    viewBox="0 0 160 24"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 4 18 Q 80 4, 156 18"
                      stroke="#A8B2A6"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </svg>
                  <div className="absolute top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[#EDF6D5] border border-[#AFC8B5] text-[#111111]">
                    <Train className="h-3 w-3" />
                  </div>
                </div>

                {/* Destination */}
                <div className="flex items-center gap-1.5 font-medium max-w-[40%] truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#111111] shrink-0" />
                  <span className="truncate">{destinationLabel}</span>
                </div>
              </div>

              <div className="text-[11px] text-[#626762] flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D4E] shrink-0" />
                <span>
                  Exposure calculated via OpenRouteService pathing &amp; CAMS telemetry.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-4 flex items-center justify-between">
        <Link
          to="/decision-lab"
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#D1EB8F] hover:bg-[#c2e078] text-[#111111] font-semibold text-sm transition-colors shadow-2xs"
        >
          <span>{activeCommute ? "Compare route options" : "Open Decision Lab"}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="text-[11px] text-[#626762]">
          Scientific exposure proxy
        </span>
      </div>
    </div>
  );
}
