import { createContext } from "react";
import type { IndianCityPreset } from "@/types/location";

export interface LocationContextType {
  currentLocation: IndianCityPreset | null;
  setCurrentLocation: (loc: IndianCityPreset | null) => void;
  isLocationSelectorOpen: boolean;
  setIsLocationSelectorOpen: (open: boolean) => void;
  isLocationLoading: boolean;
}

export const LocationContext = createContext<LocationContextType | undefined>(undefined);
