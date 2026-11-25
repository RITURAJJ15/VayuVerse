import { useQuery } from "@tanstack/react-query";
import type { GeoLocation } from "@/types/location";
import type { UserProfile } from "@/types/profile";
import type { DayPlanResponse } from "@/types/recommendations";
import type { StationObservationResponse } from "@/types/air-quality";
import type { AirQualityForecastResponse } from "@/types/forecast";
import {
  generateDeterministicDailyPlan,
  adaptComputedPlanToResponse,
} from "@/lib/daily-planning-engine";

export function useRecommendations(
  location: GeoLocation | null,
  profile: UserProfile,
  observations?: StationObservationResponse | null,
  forecast?: AirQualityForecastResponse | null
) {
  return useQuery<DayPlanResponse>({
    queryKey: [
      "recommendations",
      location?.latitude,
      location?.longitude,
      location?.name,
      observations?.naqi?.overallAqi,
      observations?.pm25?.value,
      forecast?.source?.forecastIssuedUtc,
      profile.category,
      profile.commuteMode,
      profile.sensitivity,
      profile.purifierAvailability,
      profile.departureTime,
      profile.returnTime,
    ],
    queryFn: async () => {
      if (!location) {
        throw new Error("No location selected");
      }

      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location,
            profile,
          }),
        });

        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Network or offline: fall through to local deterministic engine
        console.warn("[useRecommendations] Network failure, generating local deterministic plan:", err);
      }

      // Resilient fallback: compute deterministic plan locally using current physical telemetry
      const computed = generateDeterministicDailyPlan(
        location,
        profile,
        observations || undefined,
        forecast || undefined
      );
      return adaptComputedPlanToResponse(computed);
    },
    enabled: Boolean(location?.latitude && location?.longitude),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    retry: 1,
  });
}
