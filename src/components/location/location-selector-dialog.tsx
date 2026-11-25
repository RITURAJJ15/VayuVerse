import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  MapPin,
  X,
  Check,
  Compass,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useLocationState } from "@/context/location-context";
import { POPULAR_INDIAN_CITIES, type GeoLocation } from "@/types/location";
import { useLocationSearch, useBrowserGeolocation } from "@/hooks/use-location-search";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LocationSelectorDialog() {
  const {
    currentLocation,
    setCurrentLocation,
    isLocationSelectorOpen,
    setIsLocationSelectorOpen,
  } = useLocationState();

  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: searchResults, isLoading: isSearching, error: searchError } = useLocationSearch(searchQuery);
  const { requestPosition, isLoading: isGeoLoading, error: geoError, clearError: clearGeoError } = useBrowserGeolocation();

  const handleClose = useCallback(() => {
    setSearchQuery("");
    clearGeoError();
    setIsLocationSelectorOpen(false);
  }, [clearGeoError, setIsLocationSelectorOpen]);

  // Focus trap, initial focus, escape listener, and body scroll lock
  const { modalContainerRef } = useModalA11y({
    isOpen: isLocationSelectorOpen,
    onClose: handleClose,
    initialFocusRef: inputRef,
  });

  if (!isLocationSelectorOpen) return null;

  const handleSelect = (loc: GeoLocation) => {
    setCurrentLocation(loc);
    handleClose();
  };

  const handleUseCurrentLocation = async () => {
    const loc = await requestPosition();
    if (loc) {
      handleSelect(loc);
    }
  };

  const isQueryActive = searchQuery.trim().length >= 2;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#111111]/70 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-selector-title"
          aria-describedby="location-selector-desc"
          tabIndex={-1}
          className="relative w-full max-w-lg my-auto transform rounded-2xl border border-[#D6D6D2] bg-white text-left shadow-2xl transition-all max-h-[90vh] flex flex-col focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D6D6D2] px-4 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
            <div>
              <h2 id="location-selector-title" className="text-sm font-bold tracking-tight text-[#111111]">
                Select Indian Location
              </h2>
              <p id="location-selector-desc" className="text-xs text-[#626762]">
                Live geocoding via Open-Meteo across all Indian cities and towns
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 text-[#626762] hover:bg-[#FAFAF8] hover:text-[#111111] transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Bar + Geolocation Action */}
          <div className="p-3 sm:p-4 border-b border-[#D6D6D2] bg-[#FAFAF8] space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#626762]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Indian cities, towns, or districts (e.g. Noida, Guwahati, Pune)..."
                className="w-full rounded-xl border border-[#D6D6D2] bg-white pl-9 pr-8 py-2 text-xs text-[#111111] placeholder:text-[#626762]/70 focus:outline-none focus:ring-1 focus:ring-[#111111]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-[#626762] hover:text-[#111111] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Browser Geolocation Button */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={handleUseCurrentLocation}
                disabled={isGeoLoading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] hover:text-[#2E7D4E] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isGeoLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#111111]" />
                ) : (
                  <Compass className="h-3.5 w-3.5 text-[#626762]" />
                )}
                <span>{isGeoLoading ? "Detecting location..." : "Use my current location (GPS)"}</span>
              </button>

              {currentLocation && (
                <span className="text-[11px] text-[#626762]">
                  Active: <strong className="text-[#111111]">{currentLocation.name}</strong>
                </span>
              )}
            </div>

            {/* Geolocation Error Alert */}
            {geoError && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 text-[11px] leading-relaxed">{geoError}</div>
              </div>
            )}
          </div>

          {/* Results / Suggestions Container (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-[#D6D6D2]/60 min-h-[160px]">
          {/* Case 1: Searching */}
          {isSearching && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#626762]">
              <Loader2 className="h-5 w-5 animate-spin text-[#111111]" />
              <span>Searching Open-Meteo Indian database...</span>
            </div>
          )}

          {/* Case 2: Search Error */}
          {searchError && !isSearching && (
            <div className="py-6 text-center text-xs text-red-700">
              Could not retrieve search results. Check network connection or select a shortcut below.
            </div>
          )}

          {/* Case 3: Live Search Results */}
          {isQueryActive && !isSearching && searchResults && (
            searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#626762]">
                No Indian locations matched &ldquo;{searchQuery}&rdquo;.
                <div className="text-[11px] text-[#626762]/70 mt-1">
                  Try checking spelling or search by district name.
                </div>
              </div>
            ) : (
              searchResults.map((loc) => {
                const isSelected =
                  currentLocation?.name.toLowerCase() === loc.name.toLowerCase() &&
                  currentLocation?.state?.toLowerCase() === loc.state?.toLowerCase();

                return (
                  <button
                    key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                    onClick={() => handleSelect(loc)}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors rounded-xl cursor-pointer ${
                      isSelected
                        ? "bg-[#EDF6D5] text-[#111111]"
                        : "hover:bg-[#FAFAF8] text-[#111111]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                          isSelected
                            ? "border-[#D1EB8F] bg-[#D1EB8F] text-[#111111]"
                            : "border-[#D6D6D2] bg-[#FAFAF8] text-[#626762]"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#111111] flex items-center gap-2">
                          {loc.name}
                          {loc.district && loc.district !== loc.name && (
                            <span className="text-[10px] font-normal text-[#626762]">
                              ({loc.district})
                            </span>
                          )}
                          {isSelected && (
                            <Badge variant="softgreen" className="text-[9px] py-0 px-1.5">
                              Selected
                            </Badge>
                          )}
                        </div>
                        {/* State Disambiguation for ambiguous matches */}
                        <div className="text-[11px] text-[#626762]">
                          <span className="font-medium text-[#111111]">{loc.state}</span>, India • {loc.latitude.toFixed(2)}°N, {loc.longitude.toFixed(2)}°E
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="h-4 w-4 text-[#2E7D4E]" />}
                  </button>
                );
              })
            )
          )}

          {/* Case 4: Shortcuts when search input is empty */}
          {!isQueryActive && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#626762] uppercase tracking-wider px-2">
                <Building2 className="h-3.5 w-3.5" />
                Popular Indian Monitoring Hubs
              </div>

              <div className="divide-y divide-[#D6D6D2]/60">
                {POPULAR_INDIAN_CITIES.map((city) => {
                  const isSelected = currentLocation?.name === city.name;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      className={`w-full flex items-center justify-between p-2.5 text-left transition-colors rounded-xl cursor-pointer ${
                        isSelected
                          ? "bg-[#EDF6D5] text-[#111111]"
                          : "hover:bg-[#FAFAF8] text-[#111111]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-3.5 w-3.5 text-[#626762]" />
                        <div>
                          <span className="text-xs font-semibold text-[#111111] mr-1.5">{city.name}</span>
                          <span className="text-[11px] text-[#626762]">{city.state}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {city.stationCount && (
                          <span className="text-[10px] text-[#626762]">
                            {city.stationCount} stations
                          </span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#2E7D4E]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#D6D6D2] px-6 py-3.5 bg-[#FAFAF8] text-[11px] text-[#626762]">
          <span>Real-time search across all 28 States &amp; 8 UTs</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="border-[#D6D6D2] text-xs font-semibold rounded-lg"
          >
            Close
          </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
