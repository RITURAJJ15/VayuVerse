import { useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  X,
  ShieldCheck,
  HelpCircle,
  Car,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRANSPORT_EMISSION_FACTORS } from "@/lib/emissions-calculator";

export function AssumptionsDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#7BB350]" />
            <h4 className="text-sm font-bold text-[#111111]">
              Scientific Assumptions, Formulas &amp; Versioned Data Sources
            </h4>
          </div>
          <p className="text-xs text-[#626762]">
            Review documented ARAI/CPCB emissions factors, CAMS forecast methodology, and the concentration-time exposure proxy.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-[#111111] hover:bg-[#2b2b2b] text-white text-xs font-semibold px-4 shrink-0"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          View Calculation Assumptions
        </Button>
      </div>

      {/* Modal Dialog */}
      {isOpen && (typeof document !== "undefined" ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full my-auto max-h-[90vh] overflow-y-auto border border-[#D6D6D2] p-6 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#D6D6D2]/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#111111]" />
                <h3 className="text-base font-bold text-[#111111]">
                  Decision Lab — Methodological Transparency &amp; Assumptions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-[#626762] hover:text-[#111111] hover:bg-[#EAEAEA] transition-colors cursor-pointer"
                aria-label="Close assumptions drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 1. Concentration-Time Exposure Proxy */}
            <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-2 text-xs">
              <div className="font-bold text-[#111111] flex items-center gap-1.5">
                <Wind className="h-4 w-4 text-[#7BB350]" />
                Concentration-Time Exposure Proxy Formula
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-[#D6D6D2] font-mono text-[11px] text-[#111111]">
                Exposure Proxy (µg·h/m³) = Predicted PM2.5 (µg/m³) × Duration (hours) × Microenvironment Factor
              </div>
              <p className="text-[#526161] leading-relaxed text-[11px]">
                <strong>Important Distinction:</strong> This metric is strictly an <em>environmental concentration-time exposure proxy</em>, not an individual physiological inhaled dose or clinical risk reduction. Accurate inhaled dose requires individualized biometric measurements of minute ventilation, tidal lung volume, breathing rate, and lung airway morphology, which cannot be scientifically determined from a web application without physical sensors.
              </p>
            </div>

            {/* 2. Microenvironment Factors */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-[#626762]" />
                Documented In-Cabin / Microenvironment Attenuation
              </h4>
              <p className="text-[#526161] text-[11px] leading-relaxed">
                Peer-reviewed transport exposure studies demonstrate that vehicle cabins and metro carriages attenuate ambient particle concentrations:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8]">
                  <span className="font-bold text-[#111111] block">Two-Wheeler / Walking</span>
                  <span className="text-[#E05A47]">100% Ingress (Factor 1.0)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8]">
                  <span className="font-bold text-[#111111] block">Public Bus (Open)</span>
                  <span className="text-[#B8860B]">85% Ingress (Factor 0.85)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8]">
                  <span className="font-bold text-[#111111] block">AC Car / Cab (Closed)</span>
                  <span className="text-[#285A1D]">50% Ingress (Factor 0.50)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8]">
                  <span className="font-bold text-[#111111] block">AC Metro Rail</span>
                  <span className="text-[#285A1D]">20% Ingress (Factor 0.20)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-[#D6D6D2] bg-[#FAFAF8]">
                  <span className="font-bold text-[#111111] block">Indoor Room</span>
                  <span className="text-[#285A1D]">30% Ingress (Factor 0.30)</span>
                </div>
              </div>
            </div>

            {/* 3. Documented Transport Emission Factors */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-[#626762]" />
                Versioned Transport Emission Factors (India GHG / ARAI / CPCB)
              </h4>
              <div className="border border-[#D6D6D2] rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#FAFAF8] border-b border-[#D6D6D2] text-[#111111] font-semibold">
                    <tr>
                      <th className="p-2.5">Transport Mode</th>
                      <th className="p-2.5">Factor (g CO₂/p-km)</th>
                      <th className="p-2.5">Source &amp; Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6D6D2]">
                    {Object.values(TRANSPORT_EMISSION_FACTORS).map((item) => (
                      <tr key={item.mode} className="hover:bg-[#FAFAF8]/50">
                        <td className="p-2.5 font-medium text-[#111111]">{item.label}</td>
                        <td className="p-2.5 font-mono font-bold text-[#111111]">
                          {item.factorGramsCo2PerPassengerKm}
                        </td>
                        <td className="p-2.5 text-[#626762]">
                          {item.source} ({item.sourceVersion})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Model Forecast Notice */}
            <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1.5 text-xs text-[#526161]">
              <span className="font-bold text-[#111111] block">
                Modeled Hourly Forecast vs. Actual Observation Data:
              </span>
              <p className="text-[11px] leading-relaxed">
                Comparative time windows utilize the Copernicus CAMS Global numerical atmospheric composition model (0.25° grid) retrieved via Open-Meteo. Forecasted PM2.5 values are <strong>modeled projections</strong> of atmospheric dispersion and thermal boundary layer dynamics, not real-time physical sensor observations.
              </p>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-[#111111] hover:bg-[#2b2b2b] text-white text-xs font-semibold px-5"
              >
                Close &amp; Return to Decision Lab
              </Button>
            </div>
          </div>
        </div>,
        document.body
      ) : null)}
    </>
  );
}
