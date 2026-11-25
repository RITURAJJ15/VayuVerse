import { useState } from "react";
import { User, MapPin, Compass, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PresetSelector } from "@/components/profile/preset-selector";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { AlertPreferencesCard } from "@/components/profile/alert-preferences-card";
import { useProfileState } from "@/context/profile-context";
import { useLocationState } from "@/context/location-context";
import { useAuth } from "@/context/auth-context";
import { CATEGORY_LABELS, COMMUTE_LABELS } from "@/types/profile";

export function ProfileSettingsPage() {
  const { currentProfile, activePreset } = useProfileState();
  const { currentLocation, setIsLocationSelectorOpen } = useLocationState();
  const { user } = useAuth();

  const [savedCities] = useState([
    "New Delhi (Central)",
    "Noida Sector 62",
    "Mumbai (Kurla)",
    "Kolkata (Victoria)",
    "Guwahati (Railway Colony)",
  ]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <section className="space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#EDF6D5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111111]">
          <User className="h-3.5 w-3.5 text-[#111111]" />
          User Personalization
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
          Profile &amp; Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#626762] max-w-3xl leading-relaxed">
          Configure your daily commuting schedule, indoor air setup, and health sensitivity baseline. Your preferences and saved location remain persistent across sessions.
        </p>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl space-y-8">
        {/* Active Profile Status Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-[#D6D6D2] bg-white gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDF6D5] text-[#111111] shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#111111]">
                  {currentProfile.displayName}
                </span>
                <Badge variant="sage" className="rounded-lg">
                  {CATEGORY_LABELS[currentProfile.category]}
                </Badge>
                {activePreset && (
                  <Badge variant="outline" className="border-[#D1EB8F] bg-[#EDF6D5] text-[#111111] rounded-lg font-semibold">
                    Preset: {activePreset.cityName}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-[#626762] flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#626762]" />
                  Active Hub: <strong className="text-[#111111]">{currentLocation?.name || "Selected Region"}</strong>
                  <button
                    onClick={() => setIsLocationSelectorOpen(true)}
                    className="ml-1 text-[10px] text-[#2E7D4E] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    Change
                  </button>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Compass className="h-3 w-3 text-[#626762]" />
                  Commute: {COMMUTE_LABELS[currentProfile.commuteMode]}
                </span>
                <span>•</span>
                <span>Age: {currentProfile.ageGroup}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="outline" className="text-[10px] rounded-lg border-[#D6D6D2] text-[#626762]">
              {user ? "Authenticated Account" : "Guest Session"}
            </Badge>
          </div>
        </div>

        {/* 1. Evaluator Presets Section */}
        <section aria-labelledby="evaluator-presets-heading">
          <PresetSelector />
        </section>

        {/* 2. Detailed Profile Calibration Form */}
        <section aria-labelledby="profile-editor-heading">
          <ProfileEditor />
        </section>

        {/* 3. Real-Time Alert & Notification Preferences */}
        <section aria-labelledby="alert-preferences-heading">
          <AlertPreferencesCard />
        </section>

        {/* 4. Saved Cities Quick Access */}
        <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#111111]" />
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Saved Indian Localities &amp; Quick Access
              </h2>
            </div>
            <p className="text-xs text-[#626762]">
              Saved monitoring perimeters across Indian cities for rapid one-click navigation:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {savedCities.map((city) => (
                <div
                  key={city}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] px-3 py-1.5 text-xs text-[#111111] font-medium"
                >
                  <MapPin className="h-3 w-3 text-[#626762]" />
                  <span>{city}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
