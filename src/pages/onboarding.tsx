import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Check,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Shield,
  Sparkles,
  AlertCircle,
  Loader2,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApprovedVayuMark } from "@/components/layout/sidebar";
import { LocationAutocompleteInput } from "@/components/decision-lab/location-autocomplete-input";
import { useProfileState } from "@/context/profile-context";
import { useLocationState } from "@/context/location-context";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import type {
  UserCategory,
  CommuteMode,
  OutdoorActivity,
  ScheduleFlexibility,
} from "@/types/profile";
import type { RouteLocation } from "@/types/routes";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { updateProfile } = useProfileState();
  const { currentLocation, setCurrentLocation } = useLocationState();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states (preserved on retry)
  const [selectedPersona, setSelectedPersona] = useState<UserCategory>("college_student");
  const [displayName, setDisplayName] = useState<string>(() => {
    return (
      user?.user_metadata?.full_name ||
      (user?.email ? user.email.split("@")[0] : "") ||
      "VayuVerse Explorer"
    );
  });
  const [commuteMode, setCommuteMode] = useState<CommuteMode>("metro");
  const [outdoorActivity, setOutdoorActivity] = useState<OutdoorActivity>("evening_sports");
  const [scheduleFlexibility, setScheduleFlexibility] = useState<ScheduleFlexibility>("moderate");
  const [selectedLocation, setSelectedLocation] = useState<RouteLocation | null>(() => {
    if (currentLocation) {
      return {
        name: currentLocation.name,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: `${currentLocation.name}, ${currentLocation.state}`,
      };
    }
    return null;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Redirect if unauthenticated
  if (!isAuthLoading && !user) {
    navigate("/", { replace: true });
    return null;
  }

  const handlePersonaSelect = (persona: UserCategory) => {
    setSelectedPersona(persona);
    if (persona === "college_student") {
      setCommuteMode("metro");
      setOutdoorActivity("evening_sports");
      setScheduleFlexibility("moderate");
    } else if (persona === "office_commuter") {
      setCommuteMode("cab_car");
      setOutdoorActivity("market_errands");
      setScheduleFlexibility("low");
    } else if (persona === "senior_citizen") {
      setCommuteMode("minimal");
      setOutdoorActivity("morning_walk_jog");
      setScheduleFlexibility("high");
    }
  };

  const handleSaveAndComplete = async () => {
    if (!selectedLocation) {
      setSubmitError("Please confirm your home city or locality before continuing.");
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!user) throw new Error("Authentication required to save profile.");

      // 1. Write profile to Supabase
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          display_name: displayName.trim() || user.user_metadata?.full_name || "VayuVerse Member",
          persona: selectedPersona,
          preferences: {
            displayName: displayName.trim() || user.user_metadata?.full_name || "VayuVerse Member",
            category: selectedPersona,
            commuteMode,
            outdoorActivity,
            scheduleFlexibility,
            sensitivity: selectedPersona === "senior_citizen" ? "high" : "normal",
          },
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        throw new Error(`Profile save failed: ${profileError.message}`);
      }

      // 2. Write location to Supabase
      const roundedLat = Number(selectedLocation.latitude.toFixed(3));
      const roundedLng = Number(selectedLocation.longitude.toFixed(3));

      const { error: locError } = await supabase.from("saved_locations").insert({
        user_id: user.id,
        location_name: selectedLocation.name,
        rounded_latitude: roundedLat,
        rounded_longitude: roundedLng,
      });

      if (locError) {
        throw new Error(`Location save failed: ${locError.message}`);
      }

      // 3. Update in-memory contexts
      updateProfile({
        displayName: displayName.trim() || "VayuVerse Member",
        category: selectedPersona,
        commuteMode,
        outdoorActivity,
        scheduleFlexibility,
        sensitivity: selectedPersona === "senior_citizen" ? "high" : "normal",
      });

      setCurrentLocation({
        id: `onboard-${Date.now()}`,
        name: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        state: selectedLocation.address || "India",
        country: "India",
        countryCode: "IN",
        timezone: "Asia/Kolkata",
      });

      try {
        localStorage.setItem("vayuverse_onboarded_v1", "true");
      } catch {
        // ignore
      }

      // 4. Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("[Onboarding] Error completing onboarding:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to persist onboarding setup. Please retry."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] text-[#202820] flex flex-col selection:bg-[#DCE8D5] selection:text-[#244936]">
      {/* Botanical Header */}
      <header className="w-full border-b border-[#D6D6D2]/60 bg-[#F7F7F0]/90 backdrop-blur-md py-4 px-6 sm:px-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ApprovedVayuMark className="h-6 w-6 text-[#244936]" />
            <span className="text-lg font-bold tracking-tight text-[#244936]">
              VayuVerse
            </span>
          </div>
          <div className="text-xs font-semibold text-[#8A9085] flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[#526B4B]" />
            <span>Encrypted Personalization</span>
          </div>
        </div>
      </header>

      {/* Main Flow Canvas */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <div className="rounded-3xl border border-[#D6D6D2] bg-white p-6 sm:p-10 shadow-xl space-y-8">
          {/* Progress Indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8A9085]">
              <span className="uppercase tracking-wider font-mono text-[11px] text-[#244936] font-bold">
                Step {step} of 4 • {step === 1 ? "Lifestyle" : step === 2 ? "Routine" : step === 3 ? "Location" : "Confirmation"}
              </span>
              <span>{step * 25}% complete</span>
            </div>
            <div className="h-1.5 w-full bg-[#F7F7F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#244936] transition-all duration-300 rounded-full"
                style={{ width: `${step * 25}%` }}
              />
            </div>
          </div>

          {/* STEP 1: Lifestyle Archetype */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202820] tracking-tight">
                  Choose your lifestyle archetype
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9085] leading-relaxed">
                  VayuVerse calibrates diurnal exposure, exercise hours, and commute recommendations based on your daily pattern.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5" role="radiogroup" aria-label="Lifestyle Archetypes">
                {/* 1. Student */}
                <div
                  role="radio"
                  aria-checked={selectedPersona === "college_student"}
                  tabIndex={0}
                  onClick={() => handlePersonaSelect("college_student")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handlePersonaSelect("college_student")}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[#244936]/40 ${
                    selectedPersona === "college_student"
                      ? "border-[#244936] bg-[#DCE8D5]/20 ring-1 ring-[#244936]"
                      : "border-[#D6D6D2] hover:border-[#244936]/40 bg-white"
                  }`}
                >
                  <div className="h-11 w-11 rounded-xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#202820]">Student</h3>
                      {selectedPersona === "college_student" && (
                        <div className="h-5 w-5 rounded-full bg-[#244936] text-white flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#8A9085] leading-relaxed">
                      Campus commuting, study hours, evening sports, transit options, and practical low-cost air habits.
                    </p>
                  </div>
                </div>

                {/* 2. Working Professional */}
                <div
                  role="radio"
                  aria-checked={selectedPersona === "office_commuter"}
                  tabIndex={0}
                  onClick={() => handlePersonaSelect("office_commuter")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handlePersonaSelect("office_commuter")}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[#244936]/40 ${
                    selectedPersona === "office_commuter"
                      ? "border-[#244936] bg-[#DCE8D5]/20 ring-1 ring-[#244936]"
                      : "border-[#D6D6D2] hover:border-[#244936]/40 bg-white"
                  }`}
                >
                  <div className="h-11 w-11 rounded-xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#202820]">Working Professional</h3>
                      {selectedPersona === "office_commuter" && (
                        <div className="h-5 w-5 rounded-full bg-[#244936] text-white flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#8A9085] leading-relaxed">
                      Rush hour commute departure timing, in-cabin air comparisons, office lunch walks, and market errands.
                    </p>
                  </div>
                </div>

                {/* 3. Elderly Person */}
                <div
                  role="radio"
                  aria-checked={selectedPersona === "senior_citizen"}
                  tabIndex={0}
                  onClick={() => handlePersonaSelect("senior_citizen")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handlePersonaSelect("senior_citizen")}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[#244936]/40 ${
                    selectedPersona === "senior_citizen"
                      ? "border-[#244936] bg-[#DCE8D5]/20 ring-1 ring-[#244936]"
                      : "border-[#D6D6D2] hover:border-[#244936]/40 bg-white"
                  }`}
                >
                  <div className="h-11 w-11 rounded-xl bg-[#DCE8D5] text-[#244936] flex items-center justify-center shrink-0">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#202820]">Elderly Person</h3>
                      {selectedPersona === "senior_citizen" && (
                        <div className="h-5 w-5 rounded-full bg-[#244936] text-white flex items-center justify-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#8A9085] leading-relaxed">
                      Gentle daily pacing, avoiding dawn stagnant inversion smog, indoor protection, and low-strain habits.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-[#244936] hover:bg-[#1a3527] text-white px-6 py-2.5 text-xs font-bold"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Personal Details & Commute Preferences */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202820] tracking-tight">
                  Your daily habits &amp; routine
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9085] leading-relaxed">
                  Tailor your commute and schedule flexibility for accurate exposure recommendations.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="display-name" className="block text-xs font-bold uppercase tracking-wider text-[#202820] mb-1.5">
                    Your Name or Alias
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#D6D6D2] bg-[#F7F7F0] focus:outline-none focus:ring-1 focus:ring-[#244936]"
                  />
                </div>

                <div>
                  <label htmlFor="commute-mode-select" className="block text-xs font-bold uppercase tracking-wider text-[#202820] mb-1.5">
                    Primary Commute Mode
                  </label>
                  <select
                    id="commute-mode-select"
                    value={commuteMode}
                    onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#D6D6D2] bg-[#F7F7F0] focus:outline-none focus:ring-1 focus:ring-[#244936]"
                  >
                    <option value="metro">Metro / AC Transit Rail</option>
                    <option value="bus">Public Bus</option>
                    <option value="two_wheeler">Two-Wheeler / Scooter</option>
                    <option value="cab_car">Cab / AC Car</option>
                    <option value="walk_cycle">Walking / Cycling</option>
                    <option value="minimal">Minimal / Mostly at Home</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="outdoor-activity-select" className="block text-xs font-bold uppercase tracking-wider text-[#202820] mb-1.5">
                    Typical Outdoor Time
                  </label>
                  <select
                    id="outdoor-activity-select"
                    value={outdoorActivity}
                    onChange={(e) => setOutdoorActivity(e.target.value as OutdoorActivity)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#D6D6D2] bg-[#F7F7F0] focus:outline-none focus:ring-1 focus:ring-[#244936]"
                  >
                    <option value="morning_walk_jog">Morning Walk / Jog (06:00 – 08:00)</option>
                    <option value="evening_sports">Evening Sports / Gym (17:30 – 20:00)</option>
                    <option value="market_errands">Midday / Afternoon Market Errands</option>
                    <option value="none">Minimal Outdoor Exercise</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="schedule-flexibility-select" className="block text-xs font-bold uppercase tracking-wider text-[#202820] mb-1.5">
                    Schedule Flexibility
                  </label>
                  <select
                    id="schedule-flexibility-select"
                    value={scheduleFlexibility}
                    onChange={(e) => setScheduleFlexibility(e.target.value as ScheduleFlexibility)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-[#D6D6D2] bg-[#F7F7F0] focus:outline-none focus:ring-1 focus:ring-[#244936]"
                  >
                    <option value="high">High — I can easily shift tasks by 1–2 hours</option>
                    <option value="moderate">Moderate — Can shift routine if air quality is poor</option>
                    <option value="low">Low — Fixed departure times</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl border-[#D6D6D2] px-5 text-xs"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-[#244936] hover:bg-[#1a3527] text-white px-6 py-2.5 text-xs font-bold"
                >
                  <span>Continue to Location</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Mandatory Location Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCE8D5] text-[10px] font-bold uppercase tracking-wider text-[#244936]">
                  <Compass className="h-3 w-3" />
                  <span>Mandatory Step</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202820] tracking-tight">
                  Set your home location
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9085] leading-relaxed">
                  Search any Indian town, city, or neighborhood. We never default silently to Delhi or any hidden location — your choice dictates which verified CAAQMS monitoring station powers your dashboard.
                </p>
              </div>

              <div className="space-y-4">
                <LocationAutocompleteInput
                  label="Search Indian City or Locality"
                  placeholder="e.g. Guwahati, Bandra Mumbai, Indiranagar Bengaluru, Pune, Kolkata..."
                  value={selectedLocation}
                  onChange={(loc) => setSelectedLocation(loc)}
                  allowCurrentLocation={true}
                />

                {selectedLocation ? (
                  <div className="p-4 rounded-2xl border border-[#244936]/30 bg-[#DCE8D5]/30 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#244936] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-[#202820]">{selectedLocation.name}</div>
                      <div className="text-xs text-[#526B4B]">
                        {selectedLocation.address || "Verified Indian Territory"}
                      </div>
                      <div className="text-[11px] font-mono text-[#8A9085]">
                        Coordinates: {selectedLocation.latitude.toFixed(3)}°N, {selectedLocation.longitude.toFixed(3)}°E (rounded to ~100m for privacy)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-[#D6D6D2] bg-[#F7F7F0] text-center text-xs text-[#8A9085]">
                    No location selected yet. Type your city above or click GPS to set your active atmospheric hub.
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="rounded-xl border-[#D6D6D2] px-5 text-xs"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!selectedLocation}
                  className="rounded-xl bg-[#244936] hover:bg-[#1a3527] text-white px-6 py-2.5 text-xs font-bold disabled:opacity-50"
                >
                  <span>Review &amp; Confirm</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Review, Save & Complete */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCE8D5] text-[10px] font-bold uppercase tracking-wider text-[#244936]">
                  <Sparkles className="h-3 w-3" />
                  <span>Ready to Launch</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#202820] tracking-tight">
                  Confirm your personal setup
                </h1>
                <p className="text-xs sm:text-sm text-[#8A9085] leading-relaxed">
                  We are ready to synchronize your profile and connect to real-time municipal air monitors.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D6D6D2] bg-[#F7F7F0] p-5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-2.5">
                  <span className="text-[#8A9085] font-semibold">User Profile:</span>
                  <span className="font-bold text-[#202820]">{displayName || "VayuVerse Member"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-2.5">
                  <span className="text-[#8A9085] font-semibold">Lifestyle Archetype:</span>
                  <span className="font-bold text-[#244936] capitalize">
                    {selectedPersona.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-2.5">
                  <span className="text-[#8A9085] font-semibold">Home Monitoring Hub:</span>
                  <span className="font-bold text-[#202820]">{selectedLocation?.name || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8A9085] font-semibold">Primary Transit:</span>
                  <span className="font-bold text-[#202820] capitalize">{commuteMode.replace("_", " ")}</span>
                </div>
              </div>

              {submitError && (
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-xs text-red-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-900">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span>Database synchronization error</span>
                  </div>
                  <p>{submitError}</p>
                  <Button
                    size="sm"
                    onClick={handleSaveAndComplete}
                    className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg"
                  >
                    Retry Saving
                  </Button>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={isSubmitting}
                  className="rounded-xl border-[#D6D6D2] px-5 text-xs"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  <span>Back to Location</span>
                </Button>
                <Button
                  onClick={handleSaveAndComplete}
                  disabled={isSubmitting || !selectedLocation}
                  className="rounded-xl bg-[#244936] hover:bg-[#1a3527] text-white px-7 py-3 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup &amp; Open Dashboard</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Safeguard Note */}
      <footer className="py-6 text-center text-xs text-[#8A9085]">
        VayuVerse uses official CPCB criteria formulas • Zero medical diagnoses stored • Atmospheric telemetry grounded in verified sensors
      </footer>
    </div>
  );
}
