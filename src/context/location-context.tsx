import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { IndianCityPreset } from "@/types/location";
import { LocationContext } from "./location-context-value";
import { useAuth } from "./auth-context";
import { supabase } from "@/lib/supabase";

export const STORAGE_LOCATION_KEY = "vayuverse_active_location_v2";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(true);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState<boolean>(false);

  // 1. Initial State from localStorage (if user had previously chosen an active location in this browser session)
  // NEVER DEFAULT TO DELHI!
  const [currentLocation, setLocationState] = useState<IndianCityPreset | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_LOCATION_KEY);
      if (stored) {
        return JSON.parse(stored) as IndianCityPreset;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const lastUserIdRef = useRef<string | null>(null);

  // 2. When user logs in or auth resolves:
  useEffect(() => {
    if (isAuthLoading) return;

    let isCancelled = false;

    async function loadUserSavedLocation() {
      // If user is null (guest or signed out)
      if (!user) {
        lastUserIdRef.current = null;
        setIsLocationLoading(false);
        return;
      }

      // If user is the same and we already loaded, no-op
      if (lastUserIdRef.current === user.id) {
        setIsLocationLoading(false);
        return;
      }

      lastUserIdRef.current = user.id;
      setIsLocationLoading(true);

      try {
        // Query user's most recent saved location from Supabase
        const { data, error } = await supabase
          .from("saved_locations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isCancelled) return;

        if (data && !error) {
          const userLoc: IndianCityPreset = {
            id: data.id,
            name: data.location_name,
            latitude: Number(data.rounded_latitude),
            longitude: Number(data.rounded_longitude),
            state: "India",
            country: "India",
            countryCode: "IN",
            timezone: "Asia/Kolkata",
          };
          setLocationState(userLoc);
          try {
            localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(userLoc));
          } catch {
            // ignore
          }

          // Evict cached queries for any prior city
          queryClient.invalidateQueries({ queryKey: ["air-quality"] });
          queryClient.invalidateQueries({ queryKey: ["forecast"] });
          queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        }
      } catch (err) {
        console.warn("[Location] Failed to fetch saved location from Supabase:", err);
      } finally {
        if (!isCancelled) {
          setIsLocationLoading(false);
        }
      }
    }

    loadUserSavedLocation();

    return () => {
      isCancelled = true;
    };
  }, [user, isAuthLoading, queryClient]);

  // 3. Update location and invalidate previous environmental telemetry
  const setCurrentLocation = useCallback(
    (newLocation: IndianCityPreset | null) => {
      setLocationState(newLocation);

      if (newLocation) {
        try {
          localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(newLocation));
        } catch {
          // ignore
        }

        // Invalidate environmental and forecast queries so stale city data is evicted
        queryClient.invalidateQueries({ queryKey: ["air-quality"] });
        queryClient.invalidateQueries({ queryKey: ["forecast"] });
        queryClient.invalidateQueries({ queryKey: ["recommendations"] });

        // If authenticated, persist to Supabase saved_locations asynchronously
        if (user) {
          void supabase
            .from("saved_locations")
            .insert({
              user_id: user.id,
              location_name: newLocation.name,
              rounded_latitude: Number(newLocation.latitude.toFixed(3)),
              rounded_longitude: Number(newLocation.longitude.toFixed(3)),
            })
            .then(({ error }) => {
              if (error) {
                console.warn("[Location] Supabase insert location error:", error.message);
              }
            });
        }
      } else {
        localStorage.removeItem(STORAGE_LOCATION_KEY);
      }
    },
    [queryClient, user]
  );

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        setCurrentLocation,
        isLocationSelectorOpen,
        setIsLocationSelectorOpen,
        isLocationLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocationState() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationState must be used within a LocationProvider");
  }
  return context;
}
