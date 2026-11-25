import {
  Home,
  Building,
  Flame,
  Fan,
  Wind,
  Shield,
  Sliders,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import type {
  HouseholdProfile,
  HomeType,
  RoadExposure,
  IndoorCookingFuel,
  KitchenExhaustType,
  WindowTightness,
  PurifierStatus,
  HouseholdVulnerability,
  BudgetPreference,
} from "@/types/indoor-air";

interface HomeProfileFormProps {
  profile: HouseholdProfile;
  onChange: (updated: HouseholdProfile) => void;
}

export function HomeProfileForm({ profile, onChange }: HomeProfileFormProps) {
  const updateField = <K extends keyof HouseholdProfile>(
    field: K,
    value: HouseholdProfile[K]
  ) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };

  const toggleVulnerability = (vuln: HouseholdVulnerability) => {
    if (vuln === "none") {
      updateField("vulnerabilities", ["none"]);
      return;
    }
    const filtered = profile.vulnerabilities.filter((v) => v !== "none");
    if (filtered.includes(vuln)) {
      const next = filtered.filter((v) => v !== vuln);
      updateField("vulnerabilities", next.length > 0 ? next : ["none"]);
    } else {
      updateField("vulnerabilities", [...filtered, vuln]);
    }
  };

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#D6D6D2]/60 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-[#111111]" />
          <h3 className="text-base font-bold text-[#111111]">
            Household Clean-Air Parameters
          </h3>
        </div>
        <span className="text-xs text-[#626762]">
          Personalizes indoor ventilation, exhaust & filtration protocols
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
        {/* 1. Home Type */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Home className="h-4 w-4 text-[#626762]" />
            Dwelling Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "apartment", label: "Apartment / Flat", icon: Building },
              { id: "independent_house", label: "Independent House", icon: Home },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = profile.homeType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateField("homeType", item.id as HomeType)}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? "border-[#111111] bg-[#EDF6D5] text-[#111111] font-semibold"
                      : "border-[#D6D6D2] bg-white text-[#626762] hover:bg-[#FAFAF8]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Room Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-[#111111]">
              Primary Room Size: <span className="font-mono text-[#7BB350]">{profile.roomSizeSqFt} sq ft</span>
            </label>
            <span className="text-[11px] text-[#626762]">
              {profile.roomSizeSqFt < 160
                ? "Small Bedroom"
                : profile.roomSizeSqFt < 280
                ? "Master Bedroom"
                : "Living Room"}
            </span>
          </div>
          <input
            type="range"
            min="80"
            max="600"
            step="10"
            value={profile.roomSizeSqFt}
            onChange={(e) => updateField("roomSizeSqFt", Number(e.target.value))}
            className="w-full h-1.5 bg-[#D6D6D2] rounded-lg appearance-none cursor-pointer accent-[#7BB350]"
            aria-label="Room Size in Square Feet"
          />
          <div className="flex justify-between text-[10px] text-[#626762] font-mono">
            <span>80 sq ft</span>
            <span>200 sq ft</span>
            <span>400 sq ft</span>
            <span>600 sq ft</span>
          </div>
        </div>

        {/* 3. Nearby Road / Site Exposure */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-[#626762]" />
            Nearby Road / Site Exposure
          </label>
          <select
            value={profile.roadExposure}
            onChange={(e) => updateField("roadExposure", e.target.value as RoadExposure)}
            className="w-full p-2.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] text-xs focus:ring-1 focus:ring-[#111111] focus:outline-none"
            aria-label="Nearby Road Exposure"
          >
            <option value="busy_corridor">Major Road / Highway (&lt; 100m)</option>
            <option value="construction_nearby">Adjacent Construction / Demolition</option>
            <option value="residential_quiet">Quiet Residential Colony / Interior Lane</option>
          </select>
        </div>

        {/* 4. Cooking Fuel */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-[#626762]" />
            Cooking Fuel
          </label>
          <select
            value={profile.cookingFuel}
            onChange={(e) => updateField("cookingFuel", e.target.value as IndoorCookingFuel)}
            className="w-full p-2.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] text-xs focus:ring-1 focus:ring-[#111111] focus:outline-none"
            aria-label="Type of Cooking Fuel"
          >
            <option value="lpg">LPG Cylinder (Liquefied Petroleum Gas)</option>
            <option value="piped_gas">PNG (Piped Natural Gas)</option>
            <option value="electric_induction">Electric / Induction Stove</option>
            <option value="biomass_wood_coal">Biomass / Wood / Chulha / Coal</option>
          </select>
        </div>

        {/* 5. Kitchen Exhaust Setup */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Fan className="h-4 w-4 text-[#626762]" />
            Kitchen Exhaust
          </label>
          <select
            value={profile.kitchenExhaust}
            onChange={(e) => updateField("kitchenExhaust", e.target.value as KitchenExhaustType)}
            className="w-full p-2.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] text-xs focus:ring-1 focus:ring-[#111111] focus:outline-none"
            aria-label="Kitchen Exhaust Type"
          >
            <option value="chimney_ducted">Electric Ducted Chimney (High Suction)</option>
            <option value="wall_exhaust_fan">Standard Wall / Window Exhaust Fan</option>
            <option value="window_only">Open Window Only (No Powered Exhaust)</option>
            <option value="none_enclosed">Enclosed Kitchen with No Dedicated Vent</option>
          </select>
        </div>

        {/* 6. Window Situation */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-[#626762]" />
            Window Sealing & Frames
          </label>
          <select
            value={profile.windowTightness}
            onChange={(e) => updateField("windowTightness", e.target.value as WindowTightness)}
            className="w-full p-2.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] text-xs focus:ring-1 focus:ring-[#111111] focus:outline-none"
            aria-label="Window Sealing Situation"
          >
            <option value="modern_sealed">Modern UPVC / Double-Glazed (Sealed)</option>
            <option value="sliding_gaps">Aluminum Sliding (Brush / Track Gaps)</option>
            <option value="traditional_mesh">Casement Window with Mosquito Mesh</option>
            <option value="loose_wooden">Older Wooden Frames with Visible Drafts</option>
          </select>
        </div>

        {/* 7. Air Purifier Availability */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <Fan className="h-4 w-4 text-[#7BB350]" />
            Air Purifier Status
          </label>
          <select
            value={profile.purifierStatus}
            onChange={(e) => updateField("purifierStatus", e.target.value as PurifierStatus)}
            className="w-full p-2.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] text-xs focus:ring-1 focus:ring-[#111111] focus:outline-none"
            aria-label="Air Purifier Availability"
          >
            <option value="none">No Air Purifier Currently</option>
            <option value="single_bedroom_hepa">1 Bedroom True-HEPA Purifier</option>
            <option value="multi_room_hepa">Multi-Room / Whole-House HEPA</option>
            <option value="considering_purchase">Considering Purchasing a Purifier</option>
          </select>
        </div>

        {/* 8. Budget Preference */}
        <div className="space-y-2">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-[#626762]" />
            Action Budget Focus
          </label>
          <select
            value={profile.budgetPreference}
            onChange={(e) => updateField("budgetPreference", e.target.value as BudgetPreference)}
            className="w-full p-2.5 rounded-lg border border-[#D6D6D2] bg-white text-[#111111] text-xs focus:ring-1 focus:ring-[#111111] focus:outline-none"
            aria-label="Budget Preference"
          >
            <option value="zero_low_cost">Zero-Cost Habits &amp; Low-Cost (&lt; ₹1,000)</option>
            <option value="moderate">Moderate Upgrades (₹1,000 – ₹8,000)</option>
            <option value="premium">Premium / Full Filtration (&gt; ₹8,000)</option>
          </select>
        </div>

        {/* 9. Household Vulnerabilities */}
        <div className="space-y-2 lg:col-span-1">
          <label className="font-semibold text-[#111111] flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-[#B8860B]" />
            Vulnerable Family Members
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "infants_children", label: "Infants / Kids" },
              { id: "seniors", label: "Seniors (65+)" },
              { id: "asthma_respiratory", label: "Asthma / Respiratory" },
              { id: "none", label: "None" },
            ].map((v) => {
              const isChecked = profile.vulnerabilities.includes(
                v.id as HouseholdVulnerability
              );
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVulnerability(v.id as HouseholdVulnerability)}
                  className={`px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all ${
                    isChecked
                      ? "border-[#111111] bg-[#111111] text-white"
                      : "border-[#D6D6D2] bg-white text-[#626762] hover:bg-[#FAFAF8]"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
