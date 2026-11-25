import { useState } from "react";
import {
  Info,
  Layers,
  Radio,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DataSourceDetailsProps {
  type: "observed" | "modeled";
  sourceName: string;
  provider: string;
  stationName?: string;
  stationId?: number | string;
  coordinates?: { latitude: number; longitude: number };
  distanceKm?: number;
  pollutants?: { name: string; unit: string; value?: number | null }[];
  observedAtUtc?: string | null;
  fetchTimeUtc: string;
  freshness?: {
    category: "live" | "recent" | "delayed" | "stale";
    label: string;
    hoursAgo?: number | null;
  };
  methodologyNotes: string;
  limitations: string;
  isOpenByDefault?: boolean;
  className?: string;
}

export function DataSourceDetails({
  type,
  sourceName,
  provider,
  stationName,
  stationId,
  coordinates,
  distanceKm,
  pollutants = [],
  observedAtUtc,
  fetchTimeUtc,
  freshness,
  methodologyNotes,
  limitations,
  isOpenByDefault = false,
  className = "",
}: DataSourceDetailsProps) {
  const [isOpen, setIsOpen] = useState(isOpenByDefault);

  const isObserved = type === "observed";

  return (
    <div
      className={`rounded-[4px] border border-[#DCE2DC] bg-[#FAFAF7] text-xs transition-colors ${className}`}
      data-testid="data-source-details"
    >
      {/* Header bar / toggle */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#DCE2DC]/60">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isObserved ? "verified" : "modeled"} className="gap-1.5">
            {isObserved ? (
              <>
                <Radio className="h-3 w-3 text-[#2E7D4E]" />
                Ground Station Telemetry (Observed)
              </>
            ) : (
              <>
                <Layers className="h-3 w-3 text-[#526161]" />
                Atmospheric Model Forecast (Modeled)
              </>
            )}
          </Badge>

          {freshness && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono uppercase ${
                freshness.category === "live"
                  ? "bg-[#EAF1E9] text-[#2E7D4E]"
                  : freshness.category === "recent"
                  ? "bg-[#FFF8E7] text-[#B8860B]"
                  : freshness.category === "delayed"
                  ? "bg-[#FDECEC] text-[#C65D28]"
                  : "bg-[#FDECEC] text-[#B93838] font-semibold"
              }`}
            >
              {freshness.label}
              {freshness.hoursAgo !== undefined && freshness.hoursAgo !== null && (
                <span>({freshness.hoursAgo}h ago)</span>
              )}
            </span>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#526161] hover:text-[#182323] transition-colors"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? "Hide Metadata" : "Inspect Data Provenance"}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded provenance and methodology details */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Freshness banner if delayed or stale */}
          {freshness && (freshness.category === "delayed" || freshness.category === "stale") && (
            <div className="rounded-[3px] border border-[#E8C2B3] bg-[#FDF5F2] p-3 text-[11px] text-[#B93838] flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>
                  {freshness.category === "stale"
                    ? "Historical Telemetry Warning"
                    : "Delayed Data Transmission"}
                  :
                </strong>{" "}
                {freshness.category === "stale"
                  ? "This station has not transmitted fresh telemetry in over 24 hours. The displayed readings reflect historical archived observations and must not be interpreted as real-time ambient air quality."
                  : "Telemetry is delayed by more than 12 hours. Ambient particulate levels may have evolved since this transmission."}
              </div>
            </div>
          )}

          {/* Primary Provenance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Source Network</span>
              <span className="font-semibold text-[#182323]">{sourceName}</span>
            </div>

            <div>
              <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Provider / Authority</span>
              <span className="font-semibold text-[#182323]">{provider}</span>
            </div>

            <div>
              <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Data Classification</span>
              <span className="font-semibold text-[#182323]">
                {isObserved ? "In-Situ Physical Sensor" : "Numerical Fluid Simulation"}
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono">Backend Fetch (IST)</span>
              <span className="font-semibold text-[#182323]">
                {new Date(fetchTimeUtc).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                })} IST
              </span>
            </div>
          </div>

          {/* Station specifics (if observed) */}
          {stationName && (
            <div className="rounded-[3px] border border-[#DCE2DC] bg-white p-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-[#182323] font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#526161]" />
                  {stationName} {stationId ? `(#${stationId})` : ""}
                </span>
                {distanceKm !== undefined && (
                  <span className="text-[#526161] font-mono text-[10px]">
                    {distanceKm} km from query center
                  </span>
                )}
              </div>

              {coordinates && (
                <div className="text-[10px] text-[#8C9B9B] font-mono">
                  Coordinates: {coordinates.latitude.toFixed(4)}°N, {coordinates.longitude.toFixed(4)}°E
                </div>
              )}

              {observedAtUtc && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#526161] pt-1 border-t border-[#DCE2DC]/60">
                  <Clock className="h-3 w-3 text-[#8C9B9B]" />
                  <span>
                    Observed At:{" "}
                    <strong className="text-[#182323]">
                      {new Date(observedAtUtc).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} IST
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pollutant coverage list */}
          {pollutants.length > 0 && (
            <div>
              <span className="block text-[10px] text-[#8C9B9B] uppercase font-mono mb-1.5">
                Verified Pollutant Channels &amp; Units
              </span>
              <div className="flex flex-wrap gap-2">
                {pollutants.map((p) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border border-[#DCE2DC] bg-white text-[11px] text-[#182323]"
                  >
                    <span className="font-semibold">{p.name}</span>
                    {p.value !== undefined && p.value !== null && (
                      <span className="text-[#2E7D4E] font-mono font-medium">{p.value}</span>
                    )}
                    <span className="text-[10px] text-[#8C9B9B] font-mono">{p.unit}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Methodology & Limitations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#DCE2DC]/80 text-[11px] text-[#526161]">
            <div className="space-y-1">
              <span className="font-semibold text-[#182323] flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D4E]" />
                Methodology Notes
              </span>
              <p className="leading-relaxed text-[11px]">{methodologyNotes}</p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-[#182323] flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-[#526161]" />
                Technical &amp; Spatial Limitations
              </span>
              <p className="leading-relaxed text-[11px]">{limitations}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
