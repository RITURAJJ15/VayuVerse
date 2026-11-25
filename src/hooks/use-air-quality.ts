import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { STALE_TIMES } from "@/lib/constants";
import type { StationObservationResponse } from "@/types/air-quality";

/**
 * Hook to fetch verified OpenAQ station observations for given coordinates
 */
export function useAirQuality(
  latitude?: number,
  longitude?: number,
  city?: string
) {
  const isEnabled =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  return useQuery<StationObservationResponse, Error>({
    queryKey: ["air-quality", latitude, longitude],
    queryFn: () => apiClient.getAirQuality(latitude!, longitude!, city),
    enabled: isEnabled,
    staleTime: STALE_TIMES.AIR_QUALITY, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
