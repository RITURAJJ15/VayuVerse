import { TopographicArt } from "@/components/ui/topographic-art";
import { useLocationState } from "@/context/location-context";
import { useAirQuality } from "@/hooks/use-air-quality";
import { useForecast } from "@/hooks/use-forecast";
import { AirQualityPanel } from "@/components/air-quality/air-quality-panel";
import { ForecastPanel } from "@/components/forecast/forecast-panel";
import { CommuteSmarterCard } from "@/components/dashboard/commute-smarter";
import { TodaysPlanCard } from "@/components/dashboard/todays-plan";
import { ActiveAlertBanner } from "@/components/dashboard/active-alert-banner";
import { Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OverviewDashboardPage() {
  const { currentLocation, setIsLocationSelectorOpen } = useLocationState();

  // Fetch real OpenAQ v3 monitoring station observations for selected location
  const {
    data: aqData,
    isLoading: isAqLoading,
    isFetching: isAqFetching,
    error: aqError,
    refetch: refetchAq,
  } = useAirQuality(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  // Fetch modeled atmospheric dispersion forecast from Open-Meteo CAMS Global
  const {
    data: forecastData,
    isLoading: isForecastLoading,
    isFetching: isForecastFetching,
    error: forecastError,
    refetch: refetchForecast,
  } = useForecast(
    currentLocation?.latitude,
    currentLocation?.longitude,
    currentLocation?.name
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Real-Time Contextual Air Quality Warning Banner (Moderate, Poor, Severe) */}
      <ActiveAlertBanner />

      {/* 1. Hero Section (Two-Column Layout matching Image 1) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        {/* Left Column: Bold sans-serif heading & circular topographic artwork */}
        <div className="lg:col-span-6 xl:col-span-7 relative min-h-[260px] flex flex-col justify-between pt-2">
          {/* Circular Topographic Contour-Line Artwork behind heading */}
          <div className="absolute right-0 sm:right-6 top-1/2 -translate-y-1/2 -z-0 opacity-90 hidden sm:block">
            <TopographicArt size={320} />
          </div>

          <div className="relative z-10 max-w-xl space-y-8">
            {/* Bold, Modern Sans-Serif Hero Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-bold text-[#111111] leading-[1.04] tracking-tight">
              A better day
              <br />
              starts here.
            </h1>

            {/* Descriptor block */}
            <div className="space-y-1.5 pt-4">
              <div className="text-[11px] font-bold tracking-widest uppercase text-[#111111] leading-tight">
                VAYUVERSE
                <br />
                PERSONAL AIR-QUALITY
                <br />
                NAVIGATOR
              </div>
              <div className="w-8 h-[2px] bg-[#D1EB8F]" />
              {/* Accessible description for search & testing */}
              <p className="sr-only">
                Real-time atmosphere &amp; verified environmental intelligence across India.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Air Status Card with live verified readings */}
        <div className="lg:col-span-6 xl:col-span-5 relative z-10">
          <h2 className="sr-only">Verified Station Observations</h2>
          <AirQualityPanel
            data={aqData}
            isLoading={isAqLoading}
            isFetching={isAqFetching}
            error={aqError}
            onRefresh={() => refetchAq()}
            onSelectLocation={() => setIsLocationSelectorOpen(true)}
            selectedCityName={currentLocation?.name}
          />
        </div>
      </section>

      {/* Forecast-Only Mode Notification Banner (if ground stations unavailable within 25km) */}
      {!isAqLoading && aqData && !aqData.isAvailable && forecastData && forecastData.isAvailable && (
        <div className="rounded-xl border border-[#D6D6D2] bg-white p-4 text-xs flex items-start gap-3 shadow-2xs">
          <Info className="h-4 w-4 text-[#626762] mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-semibold text-[#111111] uppercase tracking-wider text-[11px]">
              Forecast-Only Mode Active for {currentLocation?.name}
            </span>
            <p className="text-[11px] text-[#626762] leading-relaxed">
              No active ground monitoring stations were identified within 25 km of {currentLocation?.name}.
              VayuVerse is displaying numerical atmospheric predictions from the Copernicus CAMS Global model (~40 km grid).
            </p>
          </div>
        </div>
      )}

      {/* Complete Provider Unavailability State */}
      {!isAqLoading && !isForecastLoading && aqData && !aqData.isAvailable && forecastData && !forecastData.isAvailable && (
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-8 text-center space-y-3 shadow-xs">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF6D5] text-[#111111]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
            Environmental Data Unreachable
          </h3>
          <p className="text-xs text-[#626762] max-w-md mx-auto leading-relaxed">
            Neither ground-station monitoring nor atmospheric forecast models are currently responsive for this location.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => {
              refetchAq();
              refetchForecast();
            }}
          >
            Retry Synchronization
          </Button>
        </div>
      )}

      {/* 2. Full-Width Hourly Forecast Section matching Image 1 */}
      <section aria-labelledby="forecast-section-title">
        <h2 id="forecast-section-title" className="sr-only">Atmospheric Dispersion Forecast</h2>
        <ForecastPanel
          data={forecastData}
          isLoading={isForecastLoading}
          isFetching={isForecastFetching}
          error={forecastError}
          onRefresh={() => refetchForecast()}
          selectedCityName={currentLocation?.name}
        />
      </section>

      {/* 3. Bottom Dashboard (Two Columns matching Image 1) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Commute smarter */}
        <div className="h-full">
          <CommuteSmarterCard />
        </div>

        {/* Right: Today's plan */}
        <div className="h-full">
          <TodaysPlanCard />
        </div>
      </section>
    </div>
  );
}
