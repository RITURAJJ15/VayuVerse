import { useState, useEffect, useRef } from "react";
import { MapPin, Search, CheckCircle2, AlertCircle, Loader2, X, Navigation } from "lucide-react";
import type { RouteLocation } from "@/types/routes";

interface LocationSuggestion {
  id: string | number;
  name: string;
  state?: string;
  district?: string;
  latitude: number;
  longitude: number;
}

interface LocationAutocompleteInputProps {
  label: string;
  placeholder: string;
  value: RouteLocation | null;
  onChange: (location: RouteLocation | null) => void;
  allowCurrentLocation?: boolean;
  className?: string;
}

export function LocationAutocompleteInput({
  label,
  placeholder,
  value,
  onChange,
  allowCurrentLocation = false,
  className = "",
}: LocationAutocompleteInputProps) {
  const [inputText, setInputText] = useState<string>(value?.name || "");
  const [prevValue, setPrevValue] = useState<RouteLocation | null>(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync internal input text when external value changes without effect-driven cascading renders
  if (value !== prevValue) {
    setPrevValue(value);
    setInputText(value?.name || "");
  }

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query to /api/locations
  useEffect(() => {
    const trimmed = inputText.trim();

    // If the input matches the currently selected location's name, don't trigger re-search
    if (value && value.name === trimmed && !Number.isNaN(value.latitude)) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      if (trimmed.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/locations?query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Failed to load location suggestions");
        }
        const data = await res.json();
        const results: LocationSuggestion[] = data.results || [];
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setErrorMessage("Search temporarily unavailable");
        }
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputText, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    // If text was changed, the previous coordinates are no longer valid for this new text!
    // We immediately clear the coordinates so stale coordinates are NEVER used.
    if (value && value.name !== text) {
      onChange(null);
    }
  };

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    const fullName = [s.name, s.district, s.state].filter(Boolean).join(", ");
    const newLocation: RouteLocation = {
      name: fullName,
      latitude: s.latitude,
      longitude: s.longitude,
      address: [s.district, s.state].filter(Boolean).join(", "),
    };

    setInputText(fullName);
    setSuggestions([]);
    setIsOpen(false);
    onChange(newLocation);
  };

  const handleClear = () => {
    setInputText("");
    setSuggestions([]);
    setIsOpen(false);
    onChange(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          // Reverse geocode to Indian locality name
          const res = await fetch(`/api/locations?latitude=${lat}&longitude=${lng}`);
          let placeName = `Current Location (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;

          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              const r = data.results[0];
              placeName = [r.name, r.district, r.state].filter(Boolean).join(", ");
            }
          }

          const loc: RouteLocation = {
            name: placeName,
            latitude: Number(lat.toFixed(4)),
            longitude: Number(lng.toFixed(4)),
          };

          setInputText(placeName);
          onChange(loc);
        } catch {
          // Fallback with coordinates
          const loc: RouteLocation = {
            name: `Current Location (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
            latitude: Number(lat.toFixed(4)),
            longitude: Number(lng.toFixed(4)),
          };
          setInputText(loc.name);
          onChange(loc);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage("Location permission denied. Please search by name.");
        } else {
          setErrorMessage("Unable to retrieve current location.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const isCoordinatesVerified = Boolean(
    value &&
      typeof value.latitude === "number" &&
      !Number.isNaN(value.latitude) &&
      typeof value.longitude === "number" &&
      !Number.isNaN(value.longitude)
  );

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#626762]" />
          <span>{label}</span>
        </label>

        {allowCurrentLocation && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="text-[11px] font-medium text-[#2E7D4E] hover:text-[#111111] flex items-center gap-1 transition-colors"
          >
            {isLocating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Navigation className="h-3 w-3" />
            )}
            <span>Use My Location</span>
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full text-xs pl-8 pr-16 py-2.5 rounded-xl border bg-[#FAFAF8] text-[#111111] placeholder:text-[#626762]/60 focus:outline-none transition-all ${
            isCoordinatesVerified
              ? "border-[#2E7D4E]/40 focus:border-[#2E7D4E]"
              : inputText.length > 0
              ? "border-amber-400 focus:border-amber-500"
              : "border-[#D6D6D2] focus:border-[#111111]"
          }`}
        />

        {/* Left search icon */}
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#626762]">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#111111]" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Right action icons */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {inputText && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-[#626762] hover:text-[#111111] hover:bg-[#EAEAEA]"
              aria-label="Clear location input"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {isCoordinatesVerified ? (
            <div title="Coordinates verified">
              <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
            </div>
          ) : inputText.trim().length > 0 ? (
            <div title="Select a suggestion to verify coordinates">
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Coordinate status tag or prompt */}
      {isCoordinatesVerified && value && (
        <div className="flex items-center justify-between text-[10px] text-[#2E7D4E] px-1 font-mono">
          <span>✓ Coordinates verified</span>
          <span>
            {value.latitude.toFixed(3)}°N, {value.longitude.toFixed(3)}°E
          </span>
        </div>
      )}

      {!isCoordinatesVerified && inputText.trim().length > 1 && !isLoading && (
        <div className="text-[10px] text-amber-700 px-1 font-medium flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Please select from matching places below to lock coordinates</span>
        </div>
      )}

      {errorMessage && (
        <div className="text-[10px] text-red-600 px-1">{errorMessage}</div>
      )}

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-xl border border-[#D6D6D2] bg-white p-1 shadow-lg animate-fade-in">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#626762] border-b border-[#D6D6D2]/60">
            Matching Locations in India ({suggestions.length})
          </div>
          {suggestions.map((s) => (
            <button
              key={`${s.id}-${s.latitude}-${s.longitude}`}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#EDF6D5] transition-colors flex items-start gap-2.5 group"
            >
              <MapPin className="h-3.5 w-3.5 text-[#626762] shrink-0 mt-0.5 group-hover:text-[#111111]" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#111111] truncate">{s.name}</div>
                <div className="text-[11px] text-[#626762] truncate">
                  {[s.district, s.state].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-[9px] font-mono text-[#626762]/70 shrink-0 self-center">
                {s.latitude.toFixed(2)}°, {s.longitude.toFixed(2)}°
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
