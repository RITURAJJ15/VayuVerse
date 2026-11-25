import { createContext } from "react";
import type { UserProfile, EvaluatorPreset } from "@/types/profile";

export interface ProfileContextType {
  currentProfile: UserProfile;
  activePresetId: string | null;
  activePreset: EvaluatorPreset | undefined;
  updateProfile: (updates: Partial<UserProfile>) => void;
  selectPreset: (presetId: string) => void;
  resetProfile: () => void;
  isProfileDialogOpen: boolean;
  setIsProfileDialogOpen: (isOpen: boolean) => void;
}

export const ProfileContext = createContext<ProfileContextType | null>(null);
