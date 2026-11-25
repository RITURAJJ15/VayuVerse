import { useState } from "react";
import {
  Shield,
  Wind,
  Home,
  AlertCircle,
  Fan,
  Sparkles,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocationState } from "@/context/location-context";
import { useAirQuality } from "@/hooks/use-air-quality";
import { useAlerts } from "@/hooks/use-alerts";
import { useProfileState } from "@/context/profile-context";
import type { HouseholdProfile } from "@/types/indoor-air";
import { DEFAULT_HOUSEHOLD_PROFILE, buildIndoorGuardianGuidance } from "@/lib/indoor-air-engine";
import { HomeProfileForm } from "@/components/indoor/home-profile-form";
import { ConditionalVentilationCard } from "@/components/indoor/conditional-ventilation-card";
import { PurifierCalculator } from "@/components/indoor/purifier-calculator";
import { IndoorChecklist } from "@/components/indoor/indoor-checklist";
import { TodayIndoorRecommendationsCard } from "@/components/indoor/today-indoor-recommendations";
import { SourcesLimitationsDrawer } from "@/components/indoor/sources-limitations-drawer";

interface RoomGuideline {
  room: string;
  icon: typeof Home;
  primaryRisk: string;
  recommendedAction: string;
  purifierGuidance: string;
}

const ROOM_GUIDELINES: RoomGuideline[] = [
  {
    room: "Master Bedroom",
    icon: Home,
    primaryRisk: "Night-time accumulation of outdoor particulate ingress combined with indoor CO₂.",
    recommendedAction: "Keep windows closed between 20:00 and 08:00. Use draft-stoppers under doorframes.",
    purifierGuidance: "Run True-HEPA purifier on low/whisper mode positioned 1m away from the bed headboard.",
  },
  {
    room: "Kitchen & Cooking Area",
    icon: Fan,
    primaryRisk: "High-heat frying, tadka, and gas combustion generate peak PM2.5 spikes often exceeding 350 µg/m³.",
    recommendedAction: "Operate high-suction chimney or exhaust fan BEFORE lighting burner. Keep kitchen door closed to prevent smoke migration into living areas.",
    purifierGuidance: "Do not place HEPA purifiers directly in kitchen (oil vapors clog filters). Purify the adjoining living room.",
  },
  {
    room: "Living & Dining Room",
    icon: Wind,
    primaryRisk: "Frequent front-door opening brings external ambient dust and road particles.",
    recommendedAction: "Adopt shoe-free entrance protocol. Wet mop with microfiber rather than broom sweeping to prevent aerosol re-suspension.",
    purifierGuidance: "Size purifier to Clean Air Delivery Rate (CADR) sufficient for 4 to 5 air changes per hour (ACH).",
  },
  {
    room: "Children & Study Room",
    icon: Sparkles,
    primaryRisk: "Developing lungs have higher respiratory rates per kg of body weight, making PM2.5 deposition higher.",
    recommendedAction: "Maintain clean air sanctuary with sealed window seams. Avoid chemical air fresheners, incense (agarbatti), and mosquito coils.",
    purifierGuidance: "Maintain 24/7 continuous low-speed filtration during winter inversion months.",
  },
];

export function IndoorAirPage() {
  const { currentLocation } = useLocationState();
  const { currentProfile } = useProfileState();
  const { activeBannerAlert } = useAlerts();

  // Retrieve outdoor telemetry to ground conditional window protocols
  const { data: outdoorObservations } = useAirQuality(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  // Initialize household profile from user settings if available
  const [householdProfile, setHouseholdProfile] = useState<HouseholdProfile>(() => {
    return {
      ...DEFAULT_HOUSEHOLD_PROFILE,
      homeType: currentProfile.homeType === "standalone_house" ? "independent_house" : "apartment",
      cookingFuel: currentProfile.cookingFuel === "biomass_chulha" ? "biomass_wood_coal" : "lpg",
      purifierStatus:
        currentProfile.purifierAvailability === "bedroom_hepa"
          ? "single_bedroom_hepa"
          : currentProfile.purifierAvailability === "multi_room_hepa"
          ? "multi_room_hepa"
          : "none",
      vulnerabilities: currentProfile.hasChildren
        ? ["infants_children"]
        : currentProfile.hasSeniors
        ? ["seniors"]
        : currentProfile.sensitivity === "high"
        ? ["asthma_respiratory"]
        : ["none"],
    };
  });

  const guidance = buildIndoorGuardianGuidance(householdProfile, outdoorObservations);

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      {/* Editorial Header */}
      <section className="space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#EDF6D5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111111]">
          <Shield className="h-3.5 w-3.5 text-[#111111]" />
          Residential Infiltration Defense
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
          Indoor Air Guardian
        </h1>
        <p className="text-xs sm:text-sm text-[#626762] max-w-3xl leading-relaxed">
          Personalized indoor aerosol defense for your{" "}
          <span className="font-semibold text-[#111111]">
            {householdProfile.homeType === "apartment" ? "apartment" : "independent house"}
          </span>{" "}
          in <span className="font-semibold text-[#111111]">{currentLocation?.name || "India"}</span>.
          Transform indoor spaces into clean-air sanctuaries through source elimination, targeted ventilation, and evidence-grounded HEPA sizing.
        </p>
      </section>

      {/* Main Content Sections */}
      <div className="space-y-10">
        {/* Important Scientific Safeguard Banner */}
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111111]">
            <Info className="h-4 w-4 text-[#7BB350] shrink-0" />
            <span>Essential Scientific Guardrail: Outdoor AQI Is Not Indoor Air Quality</span>
          </div>
          <p className="text-xs text-[#626762] leading-relaxed">
            Indoor PM2.5 concentrations are <strong>unmeasured without dedicated indoor hardware</strong>. Residential air quality is governed by envelope infiltration, cooking aerosols, and indoor combustion. Never assume indoor air is safe when outdoor air is polluted, and never rely on decorative houseplants (which cannot replace mechanical HEPA filtration).
          </p>
        </div>

        {/* Real-Time Conditional Ventilation Card */}
        <ConditionalVentilationCard advice={guidance.ventilationAdvice} />

        {/* Real-Time Ambient Hazard Advisory Callout for Indoor Sealing */}
        {activeBannerAlert &&
          (activeBannerAlert.severity === "Poor" ||
            activeBannerAlert.severity === "Very Poor" ||
            activeBannerAlert.severity === "Severe") && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4.5 flex items-start gap-3.5 shadow-2xs text-[#111111]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900 uppercase tracking-wide text-[11px]">
                    Ambient Air Alert: {activeBannerAlert.severity} ({activeBannerAlert.location_name})
                  </span>
                  <span className="text-[10px] bg-white/80 border border-amber-200 px-1.5 py-0.5 rounded-md font-semibold text-amber-800">
                    Priority Sealing
                  </span>
                </div>
                <p className="text-[#333] leading-relaxed">
                  Elevated particulate density detected outside. Keep building envelope tightly sealed, position draft stoppers under external door gaps, and run True-HEPA purifiers continuously.
                </p>
              </div>
            </div>
          )}

        {/* SECTION 1: Dynamic Indoor Air Recommendations */}
        <section aria-labelledby="today-indoor-recommendations-title">
          <TodayIndoorRecommendationsCard
            observations={outdoorObservations}
            profile={householdProfile}
          />
        </section>

        {/* SECTION 2: Persistent Indoor Protection Checklist */}
        <section aria-labelledby="persistent-indoor-checklist-title">
          <IndoorChecklist recommendations={guidance.recommendations} />
        </section>

        {/* Household Profile Configuration Form */}
        <section aria-labelledby="home-profile-form-title">
          <div className="mb-4">
            <h2 id="home-profile-form-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Household Configuration
            </h2>
            <p className="text-[11px] text-[#626762]">
              Adjust your living parameters to recalculate infiltration and sizing
            </p>
          </div>
          <HomeProfileForm profile={householdProfile} onChange={setHouseholdProfile} />
        </section>

        {/* Air Purifier CADR Sizing Explainer */}
        <section aria-labelledby="purifier-sizing-title">
          <PurifierCalculator initialRoomSqFt={householdProfile.roomSizeSqFt} />
        </section>

        {/* Room-by-Room Protection Blueprint */}
        <section aria-labelledby="room-blueprint-title" className="space-y-4">
          <div>
            <h2 id="room-blueprint-title" className="text-xs font-bold tracking-wider uppercase text-[#111111]">
              Room-by-Room Protection Blueprint
            </h2>
            <p className="text-[11px] text-[#626762]">
              Customized protocols for each zone in an Indian household
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROOM_GUIDELINES.map((room) => {
              const Icon = room.icon;
              return (
                <Card key={room.room} className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#111111]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-[#111111]">{room.room}</h3>
                      </div>
                      <Badge variant="sage" className="rounded-lg">Zone Blueprint</Badge>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-[#B8860B] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#111111] block">Key Vulnerability:</span>
                          <span className="text-[#626762] leading-relaxed">{room.primaryRisk}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-[#2E7D4E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#111111] block">Primary Action:</span>
                          <span className="text-[#626762] leading-relaxed">{room.recommendedAction}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Fan className="h-4 w-4 text-[#111111] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#111111] block">Filtration Guideline:</span>
                          <span className="text-[#626762] leading-relaxed">{room.purifierGuidance}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Houseplants Reality Check & Scientific Drawer */}
        <section aria-labelledby="scientific-safeguards-title">
          <SourcesLimitationsDrawer />
        </section>
      </div>
    </div>
  );
}
