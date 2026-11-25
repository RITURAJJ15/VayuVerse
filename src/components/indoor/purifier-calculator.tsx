import { useState } from "react";
import {
  Fan,
  HelpCircle,
  AlertOctagon,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { calculatePurifierSizing } from "@/lib/indoor-air-engine";

interface PurifierCalculatorProps {
  initialRoomSqFt?: number;
}

export function PurifierCalculator({
  initialRoomSqFt = 200,
}: PurifierCalculatorProps) {
  const [roomSize, setRoomSize] = useState<number>(initialRoomSqFt);
  const sizing = calculatePurifierSizing(roomSize);

  return (
    <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#D6D6D2]/60 pb-4">
        <div className="flex items-center gap-2">
          <Fan className="h-5 w-5 text-[#7BB350]" />
          <h3 className="text-base font-bold text-[#111111]">
            Air Purifier CADR Sizing Explainer
          </h3>
        </div>
        <span className="text-xs text-[#626762]">
          Based on US EPA 402-F-08-004 &amp; AHAM AC-1 Standards
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Interactive Room Sizing */}
        <div className="space-y-4 md:col-span-1 border-r-0 md:border-r md:border-[#D6D6D2]/60 md:pr-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#111111] flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#626762]" />
                Room Area:
              </label>
              <span className="font-mono font-bold text-sm text-[#111111]">
                {roomSize} sq ft
              </span>
            </div>

            <input
              type="range"
              min="60"
              max="650"
              step="10"
              value={roomSize}
              onChange={(e) => setRoomSize(Number(e.target.value))}
              className="w-full h-1.5 bg-[#D6D6D2] rounded-lg appearance-none cursor-pointer accent-[#7BB350]"
              aria-label="Room Area Slider for Purifier Sizing"
            />

            <div className="flex justify-between text-[10px] text-[#626762] font-mono">
              <span>60 sq ft</span>
              <span>200 sq ft</span>
              <span>400 sq ft</span>
              <span>650 sq ft</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[
              { label: "Small Bed", sqft: 120 },
              { label: "Master Bed", sqft: 220 },
              { label: "Living Hall", sqft: 380 },
            ].map((p) => (
              <button
                key={p.sqft}
                type="button"
                onClick={() => setRoomSize(p.sqft)}
                className={`py-1.5 px-2 rounded-md border text-[10px] font-medium transition-all ${
                  roomSize === p.sqft
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-[#D6D6D2] bg-white text-[#626762] hover:bg-[#FAFAF8]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#D6D6D2] text-[11px] text-[#626762] leading-relaxed">
            Room Volume: ~<strong className="text-[#111111]">{sizing.roomVolumeM3} m³</strong> (assuming standard 2.7m ceiling).
          </div>
        </div>

        {/* Center: Recommended Specs */}
        <div className="space-y-4 md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-[#D1EB8F] bg-[#EDF6D5] space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#285A1D] block">
                Required Smoke CADR (m³/h)
              </span>
              <div className="text-2xl font-black text-[#111111]">
                {sizing.recommendedCadrM3H} <span className="text-xs font-semibold text-[#626762]">m³/hr</span>
              </div>
              <p className="text-[11px] text-[#42523A]">
                Delivers {sizing.requiredAch} clean air changes per hour (ACH) in high-smog seasons.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#D6D6D2] bg-white space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#626762] block">
                Equivalent CADR (CFM)
              </span>
              <div className="text-2xl font-black text-[#111111]">
                {sizing.recommendedCadrCfm} <span className="text-xs font-semibold text-[#626762]">CFM</span>
              </div>
              <p className="text-[11px] text-[#626762]">
                Complies with AHAM 2/3 Rule (~2/3 of room area in CFM).
              </p>
            </div>
          </div>

          {/* Sizing physics rule */}
          <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1.5 text-xs">
            <div className="font-semibold text-[#111111] flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-[#7BB350]" />
              Why Manufacturer Area Ratings Are Misleading:
            </div>
            <p className="text-[#526161] leading-relaxed text-[11px]">
              Purifier manufacturers often market room coverage assuming only 1 to 2 air changes per hour under clean outdoor conditions. In severe Indian winter pollution (ambient PM2.5 &gt; 150 µg/m³), outdoor air continuously infiltrates through cracks. You require at least <strong>4.5 air changes per hour (ACH)</strong> to keep indoor PM2.5 below safe thresholds.
            </p>
          </div>

          {/* Safety Warnings */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="font-bold text-[#111111] flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 text-[#9B1C1C]" />
              Critical Scientific Sizing Safeguards:
            </div>
            <ul className="space-y-1.5 text-[11px] text-[#526161]">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#7BB350] shrink-0 mt-0.5" />
                <span><strong>Mechanical True-HEPA Media:</strong> Choose certified H13/H14 fiberglass filters.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-[#9B1C1C] shrink-0 mt-0.5" />
                <span><strong>Avoid Ozone &amp; Ionizers:</strong> US EPA warns that ionizers produce secondary ozone, a severe respiratory irritant.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-[#B8860B] shrink-0 mt-0.5" />
                <span><strong>Keep Out of Kitchens:</strong> Aerosolized cooking oil glazes and permanently clogs HEPA fibers. Filter adjoining rooms instead.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
