import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { STALE_TIMES } from "@/lib/constants";
import type { GeoLocation } from "@/types/location";

/**
 * Debounces a string value by given delay in ms
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Query hook for live location search across India via Open-Meteo
 */
export function useLocationSearch(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 300);

  return useQuery<GeoLocation[], Error>({
    queryKey: ["locations", "search", debouncedQuery],
    queryFn: () => apiClient.searchLocations(debouncedQuery, 8),
    enabled: debouncedQuery.length >= 2,
    staleTime: STALE_TIMES.LOCATIONS,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/**
 * Hook for browser geolocation with reverse geocoding
 */
export function useBrowserGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPosition = async (): Promise<GeoLocation | null> => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Browser geolocation is not supported on this device.");
      return null;
    }

    setIsLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode via serverless API
      const location = await apiClient.reverseGeocode(latitude, longitude);
      setIsLoading(false);
      return location;
    } catch (err: unknown) {
      setIsLoading(false);

      if (err && typeof err === "object" && "code" in err) {
        const geoErr = err as GeolocationPositionError;
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setError("Location access was denied. You can select or search for any Indian city below.");
          return null;
        }
        if (geoErr.code === geoErr.TIMEOUT) {
          setError("Location request timed out. Please select your city manually.");
          return null;
        }
      }

      const msg = err instanceof Error ? err.message : "Could not determine your location.";
      setError(msg);
      return null;
    }
  };

  return {
    requestPosition,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
