import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Check,
  MapPin,
  ArrowRight,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationAutocompleteInput } from "@/components/decision-lab/location-autocomplete-input";
import { useProfileState } from "@/context/profile-context";
import { useLocationState } from "@/context/location-context";
import { useAuth } from "@/context/auth-context";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { supabase } from "@/lib/supabase";
import type { UserCategory } from "@/types/profile";
import type { RouteLocation } from "@/types/routes";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProfile } = useProfileState();
  const { currentLocation, setCurrentLocation } = useLocationState();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPersona, setSelectedPersona] = useState<UserCategory>("college_student");
  const [selectedLocation, setSelectedLocation] = useState<RouteLocation | null>(() => {
    if (currentLocation) {
      return {
        name: currentLocation.name,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Focus trap, initial focus, escape listener, and body scroll lock
  const { modalContainerRef } = useModalA11y({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    try {
      // 1. Update Profile Context based on selected persona
      if (selectedPersona === "college_student") {
        updateProfile({
          category: "college_student",
          ageGroup: "18-24",
          commuteMode: "metro",
          outdoorActivity: "evening_sports",
          scheduleFlexibility: "moderate",
          sensitivity: "normal",
        });
      } else if (selectedPersona === "office_commuter") {
        updateProfile({
          category: "office_commuter",
          ageGroup: "25-34",
          commuteMode: "cab_car",
          outdoorActivity: "market_errands",
          scheduleFlexibility: "low",
          sensitivity: "moderate",
        });
      } else if (selectedPersona === "senior_citizen") {
        updateProfile({
          category: "senior_citizen",
          ageGroup: "65+",
          commuteMode: "minimal",
          outdoorActivity: "morning_walk_jog",
          scheduleFlexibility: "high",
          sensitivity: "high",
        });
      }

      // 2. Update Location Context if selected
      if (selectedLocation) {
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
      }

      // 3. Persist to Supabase if authenticated
      if (user) {
        try {
          await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              display_name: user.user_metadata?.full_name || "VayuVerse Navigator",
              persona: selectedPersona,
              preferences: {
                persona: selectedPersona,
                commuteMode:
                  selectedPersona === "college_student"
                    ? "metro"
                    : selectedPersona === "office_commuter"
                    ? "cab_car"
                    : "minimal",
              },
            },
            { onConflict: "user_id" }
          );

          if (selectedLocation) {
            await supabase.from("saved_locations").insert({
              user_id: user.id,
              location_name: selectedLocation.name,
              rounded_latitude: Number(selectedLocation.latitude.toFixed(3)),
              rounded_longitude: Number(selectedLocation.longitude.toFixed(3)),
            });
          }
        } catch (dbErr) {
          console.warn("[Onboarding] Supabase persistence error:", dbErr);
        }
      }

      // Store local completion flag
      try {
        localStorage.setItem("vayuverse_onboarded_v1", "true");
      } catch {
        // ignore
      }

      onClose();
      if (onComplete) onComplete();
      navigate("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#111111]/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-modal-title"
          aria-describedby="onboarding-modal-desc"
          tabIndex={-1}
          className="relative w-full max-w-xl my-auto transform rounded-3xl border border-[#D6D6D2] bg-white text-left shadow-2xl transition-all max-h-[90vh] flex flex-col focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (fixed at top of modal) */}
          <div className="flex items-start justify-between border-b border-[#D6D6D2] p-5 sm:p-6 pb-4 shrink-0">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF6D5] text-[10px] font-bold uppercase tracking-wider text-[#111111]">
                <Sparkles className="h-3 w-3 text-[#111111]" />
                <span>Step {step} of 2 • Personalization Setup</span>
              </div>
              <h2 id="onboarding-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
                {step === 1 ? "Choose Your Lifestyle Profile" : "Set Your Daily Location"}
              </h2>
              <p id="onboarding-modal-desc" className="text-xs text-[#626762]">
                {step === 1
                  ? "Select your routine archetype so VayuVerse can tailor commute and exposure pacing."
                  : "Enter your Indian city, neighborhood, or landmark for verified local sensor telemetry."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#626762] hover:text-[#111111] hover:bg-[#FAFAF8] cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Step 1: Lifestyle Profile Selection */}
            {step === 1 && (
              <div className="space-y-4" role="radiogroup" aria-label="Lifestyle Persona Profiles">
                <div className="grid grid-cols-1 gap-3">
                  {/* Option 1: Student */}
                  <div
                    role="radio"
                    aria-checked={selectedPersona === "college_student"}
                    tabIndex={0}
                    onClick={() => setSelectedPersona("college_student")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPersona("college_student");
                      }
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative focus:outline-none focus:ring-2 focus:ring-[#111111]/30 ${
                      selectedPersona === "college_student"
                        ? "border-[#111111] bg-[#FAFAF8] shadow-xs ring-1 ring-[#111111]"
                        : "border-[#D6D6D2] hover:border-[#111111]/40 bg-white"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#111111] shrink-0">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#111111]">Student</h3>
                        {selectedPersona === "college_student" && (
                          <div className="h-5 w-5 rounded-full bg-[#111111] text-white flex items-center justify-center">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#626762] leading-relaxed">
                        College travel, campus commuting, study schedules, outdoor sports, and budget-friendly air habits.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Working Professional */}
                  <div
                    role="radio"
                    aria-checked={selectedPersona === "office_commuter"}
                    tabIndex={0}
                    onClick={() => setSelectedPersona("office_commuter")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPersona("office_commuter");
                      }
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative focus:outline-none focus:ring-2 focus:ring-[#111111]/30 ${
                      selectedPersona === "office_commuter"
                        ? "border-[#111111] bg-[#FAFAF8] shadow-xs ring-1 ring-[#111111]"
                        : "border-[#D6D6D2] hover:border-[#111111]/40 bg-white"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#111111] shrink-0">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#111111]">Working Professional</h3>
                        {selectedPersona === "office_commuter" && (
                          <div className="h-5 w-5 rounded-full bg-[#111111] text-white flex items-center justify-center">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#626762] leading-relaxed">
                        Peak rush hour commute departure timing, outdoor lunch breaks, workplace indoor air, and transit comparisons.
                      </p>
                    </div>
                  </div>

                  {/* Option 3: Elderly Person */}
                  <div
                    role="radio"
                    aria-checked={selectedPersona === "senior_citizen"}
                    tabIndex={0}
                    onClick={() => setSelectedPersona("senior_citizen")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPersona("senior_citizen");
                      }
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 relative focus:outline-none focus:ring-2 focus:ring-[#111111]/30 ${
                      selectedPersona === "senior_citizen"
                        ? "border-[#111111] bg-[#FAFAF8] shadow-xs ring-1 ring-[#111111]"
                        : "border-[#D6D6D2] hover:border-[#111111]/40 bg-white"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#111111] shrink-0">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#111111]">Elderly Person</h3>
                        {selectedPersona === "senior_citizen" && (
                          <div className="h-5 w-5 rounded-full bg-[#111111] text-white flex items-center justify-center">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#626762] leading-relaxed">
                        Gentle daily routines, reduced unnecessary outdoor exposure, morning walk timing, and simple indoor protection.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-[#626762] flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-[#2E7D4E]" />
                    <span>Zero clinical or medical diagnosis stored</span>
                  </span>
                </div>
              </div>
            )}

            {/* Step 2: Location Setup */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <LocationAutocompleteInput
                    label="Home City or Locality"
                    placeholder="Search e.g. Connaught Place, Rithala, Mumbai, Guwahati..."
                    value={selectedLocation}
                    onChange={(loc) => setSelectedLocation(loc)}
                    allowCurrentLocation={true}
                  />
                </div>

                {selectedLocation ? (
                  <div className="p-3.5 rounded-2xl border border-[#2E7D4E]/30 bg-[#EDF6D5]/40 text-xs text-[#111111] flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-[#2E7D4E] shrink-0" />
                    <div>
                      <div className="font-semibold">{selectedLocation.name}</div>
                      <div className="text-[11px] text-[#626762]">
                        Coordinates: {selectedLocation.latitude.toFixed(3)}°N, {selectedLocation.longitude.toFixed(3)}°E
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-[#D6D6D2] bg-[#FAFAF8] text-xs text-[#626762] leading-relaxed">
                    Tip: You can use your browser location or search any Indian neighborhood, landmark, or sector.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer (fixed at bottom of modal) */}
          <div className="flex items-center justify-between border-t border-[#D6D6D2] p-4 sm:p-6 bg-[#FAFAF8] rounded-b-3xl shrink-0">
            {step === 1 ? (
              <div className="w-full flex justify-end">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-full bg-[#D1EB8F] hover:bg-[#c2e078] text-[#111111] font-bold text-xs px-6 shadow-2xs cursor-pointer"
                >
                  <span>Continue to Location</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-[#626762] hover:text-[#111111] cursor-pointer"
                >
                  ← Back to Profile
                </button>

                <Button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting || !selectedLocation}
                  className="rounded-full bg-[#D1EB8F] hover:bg-[#c2e078] text-[#111111] font-bold text-xs px-6 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Setting Up..." : "Enter Dashboard"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
