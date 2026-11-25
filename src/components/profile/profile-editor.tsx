import { useState } from "react";
import {
  Save,
  RotateCcw,
  Check,
  User,
  Clock,
  Compass,
  Home,
  Flame,
  Wind,
  Globe,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type UserCategory,
  type AgeGroup,
  type CommuteMode,
  type OutdoorActivity,
  type ScheduleFlexibility,
  type PollutionSensitivity,
  type HomeType,
  type CookingFuel,
  type PurifierAvailability,
  type PreferredLanguage,
  CATEGORY_LABELS,
  COMMUTE_LABELS,
  OUTDOOR_LABELS,
  HOME_TYPE_LABELS,
  COOKING_FUEL_LABELS,
  PURIFIER_LABELS,
} from "@/types/profile";
import { useProfileState } from "@/context/profile-context";

export function ProfileEditor({ onSaved }: { onSaved?: () => void }) {
  const { currentProfile, updateProfile, resetProfile } = useProfileState();

  const [category, setCategory] = useState<UserCategory>(currentProfile.category);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(currentProfile.ageGroup);
  const [sensitivity, setSensitivity] = useState<PollutionSensitivity>(currentProfile.sensitivity);
  const [commuteMode, setCommuteMode] = useState<CommuteMode>(currentProfile.commuteMode);
  const [departureTime, setDepartureTime] = useState(currentProfile.departureTime);
  const [returnTime, setReturnTime] = useState(currentProfile.returnTime);
  const [wakeUpTime, setWakeUpTime] = useState(currentProfile.wakeUpTime);
  const [sleepTime, setSleepTime] = useState(currentProfile.sleepTime);
  const [outdoorActivity, setOutdoorActivity] = useState<OutdoorActivity>(currentProfile.outdoorActivity);
  const [flexibility, setFlexibility] = useState<ScheduleFlexibility>(currentProfile.scheduleFlexibility);
  const [hasChildren, setHasChildren] = useState(currentProfile.hasChildren);
  const [hasSeniors, setHasSeniors] = useState(currentProfile.hasSeniors);
  const [homeType, setHomeType] = useState<HomeType>(currentProfile.homeType);
  const [cookingFuel, setCookingFuel] = useState<CookingFuel>(currentProfile.cookingFuel);
  const [purifier, setPurifier] = useState<PurifierAvailability>(currentProfile.purifierAvailability);
  const [language, setLanguage] = useState<PreferredLanguage>(currentProfile.preferredLanguage);

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    updateProfile({
      category,
      ageGroup,
      sensitivity,
      commuteMode,
      departureTime,
      returnTime,
      wakeUpTime,
      sleepTime,
      outdoorActivity,
      scheduleFlexibility: flexibility,
      hasChildren,
      hasSeniors,
      homeType,
      cookingFuel,
      purifierAvailability: purifier,
      preferredLanguage: language,
    });
    setSavedNotice(true);
    onSaved?.();
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleReset = () => {
    resetProfile();
    setCategory("general_individual");
    setAgeGroup("25-34");
    setSensitivity("normal");
    setCommuteMode("metro");
    setDepartureTime("08:30");
    setReturnTime("18:00");
    setWakeUpTime("06:30");
    setSleepTime("23:00");
    setOutdoorActivity("market_errands");
    setFlexibility("moderate");
    setHasChildren(false);
    setHasSeniors(false);
    setHomeType("ventilated_flat");
    setCookingFuel("lpg_chimney");
    setPurifier("none");
    setLanguage("English");
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <Card className="bg-white border-[#DCE2DC] shadow-[0_1px_3px_rgba(24,35,35,0.03)]">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#DCE2DC]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#182323] flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#182323]" />
              Personalization Calibration
            </h3>
            <p className="text-[11px] text-[#526161]">
              Tailors diurnal exposure pacing, commute routes, indoor air guardian, and personalized advisories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs text-[#526161]"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Defaults
            </Button>

            <Button
              variant="softgreen"
              size="sm"
              onClick={handleSave}
              className="text-xs"
            >
              {savedNotice ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-[#2E7D4E]" />
                  Preferences Saved!
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* 1. Category & Age */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5">
                User Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as UserCategory)}
                className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
              >
                {(Object.keys(CATEGORY_LABELS) as UserCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5">
                  Age Group
                </label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  <option value="18-24">18 – 24 (Student / Young)</option>
                  <option value="25-34">25 – 34 (Early Professional)</option>
                  <option value="35-50">35 – 50 (Mid Career / Parent)</option>
                  <option value="51-64">51 – 64 (Senior Professional)</option>
                  <option value="65+">65+ (Senior Citizen)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5">
                  Pollution Sensitivity
                </label>
                <select
                  value={sensitivity}
                  onChange={(e) => setSensitivity(e.target.value as PollutionSensitivity)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  <option value="normal">Normal (Standard CPCB thresholds)</option>
                  <option value="moderate">Moderate (Stricter PM2.5 pacing)</option>
                  <option value="high">High (Airway sensitivity / High risk)</option>
                </select>
              </div>
            </div>

            {/* Commute Mode */}
            <div>
              <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-[#526161]" />
                Primary Commuting Mode
              </label>
              <select
                value={commuteMode}
                onChange={(e) => setCommuteMode(e.target.value as CommuteMode)}
                className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
              >
                {(Object.keys(COMMUTE_LABELS) as CommuteMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {COMMUTE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>

            {/* Outdoor Activity & Flexibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5">
                  Regular Outdoor Activity
                </label>
                <select
                  value={outdoorActivity}
                  onChange={(e) => setOutdoorActivity(e.target.value as OutdoorActivity)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  {(Object.keys(OUTDOOR_LABELS) as OutdoorActivity[]).map((act) => (
                    <option key={act} value={act}>
                      {OUTDOOR_LABELS[act]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5">
                  Schedule Flexibility
                </label>
                <select
                  value={flexibility}
                  onChange={(e) => setFlexibility(e.target.value as ScheduleFlexibility)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  <option value="high">High (Can shift hours freely)</option>
                  <option value="moderate">Moderate (±45 min adjustment)</option>
                  <option value="low">Low / Fixed (Rigid commute hours)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Schedule Timings & Indoor Environment */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-[#526161]" />
                Daily Schedule &amp; Commute Timings
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Wake Up</span>
                  <input
                    type="time"
                    value={wakeUpTime}
                    onChange={(e) => setWakeUpTime(e.target.value)}
                    className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-2 py-1.5 text-xs text-[#182323]"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Departure</span>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-2 py-1.5 text-xs text-[#182323]"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Return</span>
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-2 py-1.5 text-xs text-[#182323]"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Sleep</span>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-2 py-1.5 text-xs text-[#182323]"
                  />
                </div>
              </div>
            </div>

            {/* Household Members */}
            <div>
              <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-[#526161]" />
                Household Demographics
              </label>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#182323]">
                  <input
                    type="checkbox"
                    checked={hasChildren}
                    onChange={(e) => setHasChildren(e.target.checked)}
                    className="rounded border-[#DCE2DC] text-[#2E7D4E] focus:ring-[#AFC8B5]"
                  />
                  <span>Children at home (&lt; 14 yrs)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#182323]">
                  <input
                    type="checkbox"
                    checked={hasSeniors}
                    onChange={(e) => setHasSeniors(e.target.checked)}
                    className="rounded border-[#DCE2DC] text-[#2E7D4E] focus:ring-[#AFC8B5]"
                  />
                  <span>Senior citizens at home (65+ yrs)</span>
                </label>
              </div>
            </div>

            {/* Indoor Environment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Home className="h-3 w-3 text-[#526161]" />
                  Home Type
                </label>
                <select
                  value={homeType}
                  onChange={(e) => setHomeType(e.target.value as HomeType)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  {(Object.keys(HOME_TYPE_LABELS) as HomeType[]).map((t) => (
                    <option key={t} value={t}>
                      {HOME_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Flame className="h-3 w-3 text-[#526161]" />
                  Cooking Fuel
                </label>
                <select
                  value={cookingFuel}
                  onChange={(e) => setCookingFuel(e.target.value as CookingFuel)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  {(Object.keys(COOKING_FUEL_LABELS) as CookingFuel[]).map((f) => (
                    <option key={f} value={f}>
                      {COOKING_FUEL_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Wind className="h-3 w-3 text-[#526161]" />
                  Air Purifier Setup
                </label>
                <select
                  value={purifier}
                  onChange={(e) => setPurifier(e.target.value as PurifierAvailability)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  {(Object.keys(PURIFIER_LABELS) as PurifierAvailability[]).map((p) => (
                    <option key={p} value={p}>
                      {PURIFIER_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#182323] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-[#526161]" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as PreferredLanguage)}
                  className="w-full rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] px-3 py-2 text-xs text-[#182323] focus:border-[#182323] focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिंदी (Hindi)</option>
                  <option value="Bengali">বাংলা (Bengali)</option>
                  <option value="Assamese">অসমীয়া (Assamese)</option>
                  <option value="Marathi">मराठी (Marathi)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
