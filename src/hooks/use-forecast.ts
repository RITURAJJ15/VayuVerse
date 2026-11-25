import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { STALE_TIMES } from "@/lib/constants";
import type { AirQualityForecastResponse } from "@/types/forecast";

/**
 * Hook to fetch modeled Open-Meteo CAMS Global forecast for given coordinates
 */
export function useForecast(
  latitude?: number,
  longitude?: number,
  city?: string
) {
  const isEnabled =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  return useQuery<AirQualityForecastResponse, Error>({
    queryKey: ["forecast", latitude, longitude],
    queryFn: () => apiClient.getForecast(latitude!, longitude!, city),
    enabled: isEnabled,
    staleTime: STALE_TIMES.FORECAST, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
