import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  type UserProfile,
  DEFAULT_USER_PROFILE,
  EVALUATOR_PRESETS,
} from "@/types/profile";
import { useLocationState } from "./location-context";
import { useAuth } from "./auth-context";
import { supabase } from "@/lib/supabase";
import { ProfileContext, type ProfileContextType } from "./profile-context-value";

export type { ProfileContextType };
export { ProfileContext };

const STORAGE_PROFILE_KEY = "vayuverse_user_profile_v1";
const STORAGE_PRESET_KEY = "vayuverse_active_preset_id_v1";

function loadSavedProfile(): { profile: UserProfile; presetId: string | null } {
  try {
    const savedPresetId = localStorage.getItem(STORAGE_PRESET_KEY);
    if (savedPresetId) {
      const match = EVALUATOR_PRESETS.find((p) => p.id === savedPresetId);
      if (match) {
        return { profile: match.profile, presetId: match.id };
      }
    }

    const savedJson = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (savedJson) {
      const parsed = JSON.parse(savedJson) as UserProfile;
      return { profile: parsed, presetId: null };
    }
  } catch {
    // ignore localStorage errors in guest/private mode
  }
  return { profile: DEFAULT_USER_PROFILE, presetId: null };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentLocation } = useLocationState();
  const { user } = useAuth();
  const [initial] = useState(() => loadSavedProfile());
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(initial.profile);
  const [activePresetId, setActivePresetId] = useState<string | null>(initial.presetId);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const lastProfileUserIdRef = useRef<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(currentProfile));
      if (activePresetId) {
        localStorage.setItem(STORAGE_PRESET_KEY, activePresetId);
      } else {
        localStorage.removeItem(STORAGE_PRESET_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentProfile, activePresetId]);

  // Load authenticated profile from Supabase
  useEffect(() => {
    const currentUserId = user?.id;
    const currentFullName = user?.user_metadata?.full_name;
    if (!currentUserId) {
      lastProfileUserIdRef.current = null;
      return;
    }

    if (lastProfileUserIdRef.current === currentUserId) return;
    lastProfileUserIdRef.current = currentUserId;

    let isCancelled = false;
    async function loadUserProfileFromSupabase(userId: string, defaultName?: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (isCancelled) return;

        if (data && !error) {
          const loaded: UserProfile = {
            ...DEFAULT_USER_PROFILE,
            displayName: data.display_name || defaultName || "VayuVerse Member",
            category: (data.persona as UserProfile["category"]) || "general_individual",
            ...(data.preferences || {}),
          };
          setCurrentProfile(loaded);
        }
      } catch (err) {
        console.warn("[Profile] Failed to fetch profile from Supabase:", err);
      }
    }

    loadUserProfileFromSupabase(currentUserId, currentFullName);

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const activePreset = EVALUATOR_PRESETS.find((p) => p.id === activePresetId);

  // Switch to one of the five evaluator presets & synchronize city environmental queries
  const selectPreset = useCallback(
    (presetId: string) => {
      const preset = EVALUATOR_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      setCurrentProfile(preset.profile);
      setActivePresetId(preset.id);

      // Immediately synchronize global location to the preset's city,
      // which invalidates caches and triggers real environmental data retrieval
      setCurrentLocation({
        id: preset.id,
        name: preset.cityName,
        latitude: preset.coordinates.latitude,
        longitude: preset.coordinates.longitude,
        state: preset.state,
        country: "India",
        countryCode: "IN",
        timezone: "Asia/Kolkata",
      });
    },
    [setCurrentLocation]
  );

  // Custom user updates (edits to timings, commute, etc.)
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setCurrentProfile((prev) => {
        const updated = { ...prev, ...updates };

        // If authenticated, persist to Supabase profiles
        if (user) {
          void supabase
            .from("profiles")
            .upsert(
              {
                user_id: user.id,
                display_name: updated.displayName,
                persona: updated.category,
                preferences: updated,
              },
              { onConflict: "user_id" }
            )
            .then(({ error }) => {
              if (error) {
                console.warn("[Profile] Supabase profile upsert error:", error.message);
              }
            });
        }

        return updated;
      });
    },
    [user]
  );

  // Reset to default guest profile
  const resetProfile = useCallback(() => {
    setCurrentProfile(DEFAULT_USER_PROFILE);
    setActivePresetId(null);
    try {
      localStorage.removeItem(STORAGE_PROFILE_KEY);
      localStorage.removeItem(STORAGE_PRESET_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        currentProfile,
        activePresetId,
        activePreset,
        updateProfile,
        selectPreset,
        resetProfile,
        isProfileDialogOpen,
        setIsProfileDialogOpen,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfileState() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfileState must be used within a ProfileProvider");
  }
  return context;
}
