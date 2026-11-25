import { useState, useEffect, useRef } from "react";
import {
  Car,
  Bike,
  Train,
  Footprints,
  Navigation,
  Info,
  AlertTriangle,
  Check,
  Layers,
  Bookmark,
  BookmarkCheck,
  ArrowUpDown,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteMap } from "./route-map";
import { LocationAutocompleteInput } from "./location-autocomplete-input";
import { useAuth } from "@/context/auth-context";
import {
  fetchSavedCommutes,
  createSavedCommute,
  deleteSavedCommute,
  type SavedCommute,
} from "@/lib/saved-commutes";
import {
  SAMPLE_INDIAN_JOURNEYS,
  type ComputedRoute,
  type ComputeRoutesResponse,
  type RouteLocation,
  type RouteTravelMode,
} from "@/types/routes";

interface RouteComparisonPanelProps {
  predictedPm25?: number;
  initialCityName?: string;
}

type SortPriority = "duration" | "distance" | "emissions" | "exposure";

export function RouteComparisonPanel({
  predictedPm25 = 85,
}: RouteComparisonPanelProps) {
  const { user } = useAuth();

  // 1. Location state: unselected by default on first use (NO hardcoded defaults)
  const [origin, setOrigin] = useState<RouteLocation | null>(null);
  const [destination, setDestination] = useState<RouteLocation | null>(null);
  const [selectedMode, setSelectedMode] = useState<RouteTravelMode>("DRIVE");
  const [departureTime, setDepartureTime] = useState<string>("08:30");
  const [sortPriority, setSortPriority] = useState<SortPriority>("duration");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [routeResponse, setRouteResponse] = useState<ComputeRoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Saved commutes state
  const [savedCommutes, setSavedCommutes] = useState<SavedCommute[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [commuteNickname, setCommuteNickname] = useState<string>("");
  const [isSavingCommute, setIsSavingCommute] = useState<boolean>(false);

  // Track active request ID to prevent out-of-order race conditions
  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load saved commutes on mount or auth change
  useEffect(() => {
    fetchSavedCommutes(user?.id).then(setSavedCommutes);
  }, [user?.id]);

  // Handle origin or destination change: immediately clear stale results
  const handleOriginChange = (loc: RouteLocation | null) => {
    setOrigin(loc);
    clearStaleRouteData();
  };

  const handleDestinationChange = (loc: RouteLocation | null) => {
    setDestination(loc);
    clearStaleRouteData();
  };

  const clearStaleRouteData = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setRouteResponse(null);
    setSelectedRouteId(null);
    setFetchError(null);
  };

  // Execute Route Computation with validation
  const handleComputeRoutes = async (
    modeOverride?: RouteTravelMode,
    originOverride?: RouteLocation,
    destOverride?: RouteLocation
  ) => {
    const modeToFetch = modeOverride || selectedMode;
    const originToUse = originOverride || origin;
    const destToUse = destOverride || destination;

    // Validation 1: Both locations must be selected
    if (!originToUse || !destToUse) {
      setFetchError("Please select both a starting location and a destination from the suggestions.");
      return;
    }

    // Validation 2: Coordinates must be valid numbers
    if (
      typeof originToUse.latitude !== "number" ||
      Number.isNaN(originToUse.latitude) ||
      typeof destToUse.latitude !== "number" ||
      Number.isNaN(destToUse.latitude)
    ) {
      setFetchError("Selected locations do not have valid geographical coordinates. Please pick matching locations from the list.");
      return;
    }

    // Validation 3: Origin and destination cannot be identical
    const latDiff = Math.abs(originToUse.latitude - destToUse.latitude);
    const lngDiff = Math.abs(originToUse.longitude - destToUse.longitude);
    if (latDiff < 0.0002 && lngDiff < 0.0002) {
      setFetchError("Starting location and destination are too close or identical. Please choose distinct locations.");
      return;
    }

    // Public transit check: ORS lacks municipal GTFS
    if (modeToFetch === "TRANSIT") {
      setRouteResponse({
        isConfigured: true,
        isAvailable: false,
        status: "unsupported_mode",
        routes: [],
        selectedMode: "TRANSIT",
        origin: originToUse,
        destination: destToUse,
        provider: "OpenRouteService via HeiGIT",
        message: "Public transit routing is currently unavailable. Scheduled public transit (Metro / City Bus) requires municipal GTFS timetable integration.",
        uncertaintyNotes: [
          "To avoid presenting fabricated bus or train schedules, scheduled public transit routes are not computed.",
          "Use the Departure & Mode Simulation tab above to compare Metro vs Car vs Two-Wheeler exposure estimates based on atmospheric dispersion modeling.",
        ],
      });
      setSelectedRouteId(null);
      return;
    }

    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentReqId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: originToUse,
          destination: destToUse,
          travelMode: modeToFetch,
          predictedPm25,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data: ComputeRoutesResponse = await res.json();

      // Guard against out-of-order responses overwriting newer user requests
      if (currentReqId !== activeRequestIdRef.current) {
        return;
      }

      setRouteResponse(data);
      if (data.routes && data.routes.length > 0) {
        setSelectedRouteId(data.routes[0]?.id ?? null);
      } else {
        setSelectedRouteId(null);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setFetchError((err as Error).message || "Failed to compute routes.");
      }
    } finally {
      if (currentReqId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleModeChange = (mode: RouteTravelMode) => {
    setSelectedMode(mode);
    if (origin && destination) {
      handleComputeRoutes(mode);
    }
  };

  // Load a demonstration preset
  const handleSelectJourneyPreset = (index: number) => {
    const j = SAMPLE_INDIAN_JOURNEYS[index];
    if (j) {
      clearStaleRouteData();
      setOrigin(j.origin);
      setDestination(j.destination);
      handleComputeRoutes(selectedMode, j.origin, j.destination);
    }
  };

  // Load a user-saved commute
  const handleSelectSavedCommute = (c: SavedCommute) => {
    clearStaleRouteData();
    const newOrigin: RouteLocation = {
      name: c.origin_name,
      latitude: Number(c.origin_latitude),
      longitude: Number(c.origin_longitude),
    };
    const newDest: RouteLocation = {
      name: c.destination_name,
      latitude: Number(c.destination_latitude),
      longitude: Number(c.destination_longitude),
    };

    setOrigin(newOrigin);
    setDestination(newDest);
    setSelectedMode(c.travel_mode);
    if (c.departure_time) setDepartureTime(c.departure_time);
    handleComputeRoutes(c.travel_mode, newOrigin, newDest);
  };

  // Save current route to user profile
  const handleSaveCurrentCommute = async () => {
    if (!origin || !destination) return;
    const nickname = commuteNickname.trim() || `${origin.name.split(",")[0]} to ${destination.name.split(",")[0]}`;

    setIsSavingCommute(true);
    try {
      const saved = await createSavedCommute(
        {
          route_nickname: nickname,
          origin_name: origin.name,
          origin_latitude: origin.latitude,
          origin_longitude: origin.longitude,
          destination_name: destination.name,
          destination_latitude: destination.latitude,
          destination_longitude: destination.longitude,
          travel_mode: selectedMode,
          departure_time: departureTime,
        },
        user?.id
      );

      setSavedCommutes((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setIsSaveModalOpen(false);
      setCommuteNickname("");
    } catch (err) {
      console.error("Failed to save commute:", err);
    } finally {
      setIsSavingCommute(false);
    }
  };

  const handleDeleteCommute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSavedCommute(id, user?.id);
    setSavedCommutes((prev) => prev.filter((item) => item.id !== id));
  };

  // Sorted routes based on user preference
  const sortedRoutes = [...(routeResponse?.routes || [])].sort((a, b) => {
    switch (sortPriority) {
      case "duration":
        return a.durationMinutes - b.durationMinutes;
      case "distance":
        return a.distanceKm - b.distanceKm;
      case "emissions":
        return a.emissionsGramsCo2 - b.emissionsGramsCo2;
      case "exposure":
        return (a.exposureProxyUghM3 || 0) - (b.exposureProxyUghM3 || 0);
      default:
        return 0;
    }
  });

  const activeRoute: ComputedRoute | undefined =
    routeResponse?.routes.find((r) => r.id === selectedRouteId) ||
    sortedRoutes[0];

  return (
    <div className="space-y-6">
      {/* 1. Saved Commutes Bar (If user has saved routes) */}
      {savedCommutes.length > 0 && (
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
              <BookmarkCheck className="h-3.5 w-3.5 text-[#2E7D4E]" />
              <span>Saved Daily Commutes ({savedCommutes.length})</span>
            </span>
            <span className="text-[11px] text-[#626762]">Click to recompute with live atmospheric conditions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedCommutes.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectSavedCommute(c)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] hover:bg-[#EDF6D5] text-xs font-medium cursor-pointer transition-all shadow-2xs"
              >
                <span className="font-semibold text-[#111111]">{c.route_nickname}</span>
                <span className="text-[10px] text-[#626762] uppercase font-mono">({c.travel_mode})</span>
                <button
                  onClick={(e) => handleDeleteCommute(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#626762] hover:text-red-600 transition-opacity"
                  title="Delete saved commute"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Header & Main Controls Card */}
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6D6D2] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-[#111111]" />
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                Smart Route Planner
              </h2>
            </div>
            <p className="text-xs text-[#626762] mt-0.5">
              Multi-modal journey navigation with versioned ARAI/CPCB transport emissions and regional atmospheric exposure modeling.
            </p>
          </div>

          <Badge variant="outline" className="border-[#D6D6D2] text-[11px] self-start sm:self-auto font-medium">
            Route &amp; Air Quality Insights
          </Badge>
        </div>

        {/* Optional Example Demonstration Shortcuts */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#626762] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[#111111]" />
            <span>Demonstration Shortcuts (Optional Examples):</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_INDIAN_JOURNEYS.map((j, idx) => (
              <button
                key={j.label}
                type="button"
                onClick={() => handleSelectJourneyPreset(idx)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAFAF8] text-[#626762] hover:bg-[#EDF6D5] hover:text-[#111111] border border-[#D6D6D2] transition-colors"
              >
                {j.city} Example
              </button>
            ))}
          </div>
        </div>

        {/* Autocomplete Origin / Destination & Departure Time Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Origin Autocomplete Input */}
          <div className="sm:col-span-5">
            <LocationAutocompleteInput
              label="Starting Location"
              placeholder="Enter starting location"
              value={origin}
              onChange={handleOriginChange}
              allowCurrentLocation={true}
            />
          </div>

          {/* Destination Autocomplete Input */}
          <div className="sm:col-span-5">
            <LocationAutocompleteInput
              label="Destination"
              placeholder="Where are you going?"
              value={destination}
              onChange={handleDestinationChange}
            />
          </div>

          {/* Departure Time */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-[#111111]">Departure</label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>
        </div>

        {/* Mode Selector Buttons & Compute Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Travel Mode">
            {[
              { mode: "DRIVE" as RouteTravelMode, label: "Car", icon: Car },
              { mode: "TWO_WHEELER" as RouteTravelMode, label: "Two-Wheeler", icon: Bike },
              { mode: "TRANSIT" as RouteTravelMode, label: "Metro / Transit", icon: Train },
              { mode: "WALK" as RouteTravelMode, label: "Walking", icon: Footprints },
              { mode: "BICYCLE" as RouteTravelMode, label: "Cycling", icon: Bike },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMode === m.mode;
              return (
                <button
                  key={m.mode}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleModeChange(m.mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[#111111] text-white shadow-2xs"
                      : "bg-[#FAFAF8] text-[#626762] hover:bg-[#EDF6D5]/60 border border-[#D6D6D2]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {routeResponse && routeResponse.status === "success" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveModalOpen(true)}
                className="rounded-full text-xs border-[#D6D6D2] hover:bg-[#EDF6D5] text-[#111111]"
              >
                <Bookmark className="h-3.5 w-3.5 mr-1 text-[#2E7D4E]" />
                <span>Save Commute</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => handleComputeRoutes()}
              disabled={isLoading || !origin || !destination}
              className="rounded-full bg-[#D1EB8F] hover:bg-[#c2e078] text-[#111111] font-bold text-xs px-5 shadow-2xs disabled:opacity-50"
            >
              {isLoading ? "Calculating..." : "Compute Routes"}
            </Button>
          </div>
        </div>

        {/* Mode Disclaimers */}
        <div className="text-[11px] text-[#626762] pt-1 border-t border-[#D6D6D2]/60">
          {selectedMode === "TWO_WHEELER" && (
            <span>
              <strong>Two-Wheeler Notice:</strong> Utilizes road network routing geometry for motorbikes and scooters. Does not route through pedestrian paths or illegal shortcuts.
            </span>
          )}
          {selectedMode === "DRIVE" && (
            <span>
              <strong>Car Routing:</strong> Turn-by-turn road navigation for passenger vehicles. Assumes air-conditioned in-cabin filtration (~0.50 microenvironment factor).
            </span>
          )}
          {selectedMode === "WALK" && (
            <span>
              <strong>Pedestrian Routing:</strong> Uses sidewalks, pedestrian crossings, and walking pathways. Zero direct vehicle tailpipe emissions.
            </span>
          )}
          {selectedMode === "BICYCLE" && (
            <span>
              <strong>Cycling Routing:</strong> Optimized for bicycle-accessible roads and lanes. Zero direct operational emissions.
            </span>
          )}
          {selectedMode === "TRANSIT" && (
            <span>
              <strong>Transit Notice:</strong> Municipal GTFS feeds are currently not integrated. Scheduled public transit route geometries are disabled to prevent fictitious timetable simulation.
            </span>
          )}
        </div>
      </div>

      {/* 3. Validation Error State */}
      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-xs text-red-800 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Routing Notice:</span> {fetchError}
          </div>
        </div>
      )}

      {/* 3b. Unconfigured Provider View */}
      {routeResponse && routeResponse.status === "unconfigured" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs text-amber-900 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>OpenRouteService is Not Configured (Server-Side Fallback Active)</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {routeResponse.message || "Route calculation key is not configured on the server."}
          </p>
          <div className="pt-2 text-[11px] text-[#626762] border-t border-amber-200/60">
            <strong>Feature Availability Status:</strong> Real street road routing requires OPENROUTESERVICE_API_KEY. Use <strong>What-If Departure Simulation:</strong> to model exposure tradeoffs.
          </div>
        </div>
      )}

      {/* 4. Unsupported Mode View (Public Transit) */}
      {routeResponse && routeResponse.status === "unsupported_mode" && (
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDF6D5] text-[#111111] shrink-0 mt-0.5">
              <Train className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111111]">
                Transit Routing Currently Unavailable
              </h3>
              <p className="text-xs text-[#626762] leading-relaxed">
                Scheduled public transit route planning requires an official municipal transit authority General Transit Feed Specification (GTFS) feed (such as Delhi Metro DMRC or Mumbai Suburban Railway timetables).
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-4 text-xs text-[#626762] space-y-2">
            <h4 className="font-bold text-[#111111]">Scientific Safeguard &amp; Next Steps:</h4>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>No Fabricated Schedules:</strong> VayuVerse strictly refuses to generate fictional metro departure times or bus intervals.
              </li>
              <li>
                <strong>Simulate Modal Shift:</strong> Use the <strong>&ldquo;Departure &amp; Mode Simulation&rdquo;</strong> tab to compare Metro vs. Car exposure differentials and ARAI/CPCB emissions without requiring live GTFS feeds.
              </li>
              <li>
                <strong>Supported Street Routes:</strong> Select <strong>Car</strong>, <strong>Two-Wheeler</strong>, <strong>Walking</strong>, or <strong>Cycling</strong> to calculate actual road geometry.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 5. Rate Limited State */}
      {routeResponse && routeResponse.status === "rate_limited" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs text-amber-900 space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Query Limit Reached</span>
          </div>
          <p className="text-[11px] text-amber-800">
            {routeResponse.message || "To ensure service reliability, queries are throttled. Please retry momentarily."}
          </p>
        </div>
      )}

      {/* 6. No Routes Found State */}
      {routeResponse && routeResponse.status === "no_routes_found" && (
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 text-center space-y-2">
          <Info className="h-6 w-6 text-[#626762] mx-auto" />
          <h3 className="text-sm font-bold text-[#111111]">No Direct Route Found</h3>
          <p className="text-xs text-[#626762] max-w-md mx-auto">
            {routeResponse.message || `No direct ${selectedMode.toLowerCase()} path found between the selected coordinates.`}
          </p>
        </div>
      )}

      {/* 7. Successful Results: Map & Comparison Cards */}
      {routeResponse && routeResponse.status === "success" && sortedRoutes.length > 0 && (
        <div className="space-y-6">
          {/* Leaflet Map Component */}
          <RouteMap
            origin={origin}
            destination={destination}
            routes={sortedRoutes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
          />

          {/* Tradeoff Sorting & Priorities Header */}
          <div className="rounded-2xl border border-[#D6D6D2] bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#111111]" />
                <span>Route Tradeoffs &amp; Priority Ranking ({sortedRoutes.length} options)</span>
              </h3>
              <p className="text-[11px] text-[#626762] mt-0.5">
                Compare alternatives by your personal priority. Ambient PM2.5 proxy: <strong>{predictedPm25} µg/m³</strong>.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[#626762]">Sort by:</span>
              {(
                [
                  { id: "duration", label: "Fastest" },
                  { id: "distance", label: "Shortest" },
                  { id: "emissions", label: "Lowest Carbon" },
                  { id: "exposure", label: "Lowest Exposure" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSortPriority(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sortPriority === p.id
                      ? "bg-[#111111] text-white shadow-2xs"
                      : "bg-[#FAFAF8] text-[#626762] hover:bg-[#EDF6D5] border border-[#D6D6D2]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Route Options Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRoutes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-[#111111] bg-white shadow-xs ring-1 ring-[#111111]"
                      : "border-[#D6D6D2] bg-[#FAFAF8] hover:border-[#111111]/40"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-[#111111] text-white">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold border-[#D6D6D2]"
                      >
                        {route.travelMode}
                      </Badge>
                      <h4 className="text-xs font-bold text-[#111111] truncate max-w-[170px]">
                        {route.summary}
                      </h4>
                    </div>

                    {/* Distance and Duration Metrics */}
                    <div className="flex items-baseline gap-3 pt-1">
                      <div className="text-2xl font-bold text-[#111111]">
                        {route.durationMinutes}{" "}
                        <span className="text-xs font-normal text-[#626762]">min</span>
                      </div>
                      <div className="text-sm font-semibold text-[#626762]">
                        {route.distanceKm} km
                      </div>
                    </div>

                    {/* Walking Segments */}
                    {route.walkingDistanceMeters > 0 && (
                      <div className="text-[11px] text-[#626762] space-y-1 pt-1 border-t border-[#D6D6D2]/60">
                        <div className="flex items-center gap-1.5">
                          <Footprints className="h-3 w-3 text-[#111111]" />
                          <span>
                            Walking: {route.walkingDistanceMeters}m ({route.walkingDurationMinutes} min)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Emissions & Exposure Dividends */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D6D6D2]/60 text-xs">
                      <div>
                        <span className="text-[10px] text-[#626762] block">Transport Carbon</span>
                        <span className="font-bold text-[#111111]">
                          {route.emissionsGramsCo2} g <span className="text-[10px] font-normal">CO₂e</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#626762] block">Exposure Proxy</span>
                        <span className="font-bold text-[#2E7D4E]">
                          {route.exposureProxyUghM3 ?? "—"}{" "}
                          <span className="text-[10px] font-normal">µg·h/m³</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Turn-by-Turn Steps Breakdown */}
          {activeRoute && activeRoute.steps.length > 0 && (
            <div className="rounded-2xl border border-[#D6D6D2] bg-white p-5 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                <span>Turn-by-Turn Steps ({activeRoute.summary})</span>
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {activeRoute.steps.map((step, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-lg border border-[#D6D6D2]/60 bg-[#FAFAF8] text-xs flex items-start gap-3"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EDF6D5] text-[10px] font-bold text-[#111111] shrink-0 mt-0.5">
                      {sIdx + 1}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="font-semibold text-[#111111]">{step.instruction}</div>
                      <div className="text-[11px] text-[#626762]">
                        {step.distanceMeters}m • {Math.round(step.staticDurationSeconds / 60)} min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scientific Air Quality Disclosure (Part 8 Scientific Safeguard) */}
          <div className="rounded-2xl border border-[#D6D6D2] bg-[#FAFAF8] p-5 text-xs text-[#626762] space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-[#111111]">
              <Info className="h-4 w-4 text-[#111111]" />
              <span>Scientific Disclosure: Street-Level Air Quality &amp; Exposure Limitations</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Available air-quality data cannot reliably determine which road has lower pollution.</strong> Numerical atmospheric dispersion models operate on a regional grid (~40 km resolution) and do not resolve street-to-street or intersection differences.
            </p>
            <p className="text-[11px] leading-relaxed">
              <strong>Exposure Proxy Formula:</strong> Calculated as{" "}
              <code className="text-[#111111] font-mono bg-white px-1.5 py-0.5 rounded border border-[#D6D6D2]">
                Exposure (µg·h/m³) = Ambient PM2.5 × [(Walking Hours × 1.0) + (In-Vehicle Hours × Infiltration Factor)]
              </code>
              . Car AC cabin infiltration is modeled at 0.50 factor; open two-wheelers and pedestrians are modeled at 1.00 factor. This estimate is an atmospheric exposure proxy, not a personal biometric dose measurement.
            </p>
          </div>
        </div>
      )}

      {/* Save Commute Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D6D6D2] pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-[#2E7D4E]" />
                <h3 className="text-sm font-bold text-[#111111]">Save This Daily Commute</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-xs text-[#626762] hover:text-[#111111]"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111111]">Commute Nickname</label>
                <input
                  type="text"
                  value={commuteNickname}
                  onChange={(e) => setCommuteNickname(e.target.value)}
                  placeholder="e.g. Home to College, Office Route"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-3 text-[11px] text-[#626762] space-y-1 font-medium">
                <div>
                  <strong>From:</strong> {origin?.name}
                </div>
                <div>
                  <strong>To:</strong> {destination?.name}
                </div>
                <div>
                  <strong>Mode:</strong> {selectedMode} • {departureTime}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCurrentCommute}
                disabled={isSavingCommute}
                className="text-xs rounded-xl bg-[#D1EB8F] hover:bg-[#c2e078] text-[#111111] font-bold"
              >
                {isSavingCommute ? "Saving..." : "Save Route"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
