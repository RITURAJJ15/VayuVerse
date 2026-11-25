import { useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  AlertTriangle,
  X,
  ShieldCheck,
  Leaf,
  ZapOff,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SourcesLimitationsDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#7BB350]" />
            <h4 className="text-sm font-bold text-[#111111]">
              Scientific Safeguards &amp; Methodological Limitations
            </h4>
          </div>
          <p className="text-xs text-[#626762]">
            Why outdoor AQI does not equal indoor air, unmeasured indoor PM2.5 notices, and plant myth debunking.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-[#111111] hover:bg-[#2b2b2b] text-white text-xs font-semibold px-4 shrink-0"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Review Scientific Sources
        </Button>
      </div>

      {/* Modal / Overlay */}
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
                  Indoor Air Guardian — Evidence &amp; Integrity Framework
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-[#626762] hover:text-[#111111] hover:bg-[#EAEAEA] transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Core Scientific Safeguard 1: Unmeasured Indoor Air */}
            <div className="p-4 rounded-xl border border-[#F8B4B4] bg-[#FDE8E8] space-y-2 text-xs">
              <div className="font-bold text-[#9B1C1C] flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Safeguard 1: Outdoor AQI Is Not Indoor Air Quality
              </div>
              <p className="text-[#771D1D] leading-relaxed">
                Outdoor AQI cannot be presented as your indoor air quality. Actual indoor particulate concentration is strictly unmeasured unless monitored by dedicated indoor optical particle counters. Indoor PM2.5 depends on building infiltration rate (0.2–1.2 ACH), window tightness, unvented frying/tadka, incense, and mechanical filtration. VayuVerse will <strong>never synthesize or invent a synthetic indoor PM2.5 number</strong>.
              </p>
            </div>

            {/* Core Scientific Safeguard 2: Houseplants Debunked */}
            <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-2 text-xs">
              <div className="font-bold text-[#111111] flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-[#7BB350] shrink-0" />
                Safeguard 2: Houseplants Cannot Replace HEPA Filtration
              </div>
              <p className="text-[#526161] leading-relaxed">
                Popular internet claims often cite the 1989 NASA Clean Air Study claiming plants purify air. However, that study tested plants inside miniature, sealed 0.5 m³ Plexiglas chambers. Real-world residential peer-reviewed studies (Cummings &amp; Waring, 2020) prove that in ventilated homes with normal human occupancy, houseplants have a Clean Air Delivery Rate (CADR) of less than 0.05 m³/h. You would need <strong>100 to 1,000 plants per room</strong> to match a single compact HEPA filter, which creates dangerous levels of mold spores and humidity.
              </p>
            </div>

            {/* Core Scientific Safeguard 3: Ozone / Ionizer Warning */}
            <div className="p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-2 text-xs">
              <div className="font-bold text-[#111111] flex items-center gap-1.5">
                <ZapOff className="h-4 w-4 text-[#B8860B] shrink-0" />
                Safeguard 3: Prohibition on Ozone-Emitting Cleaners
              </div>
              <p className="text-[#526161] leading-relaxed">
                The US EPA, California Air Resources Board (CARB), and WHO explicitly warn against air cleaners using ozone generators or unshielded electrostatic ionizers. Ozone is a toxic oxidizing gas that causes chest tightness, shortness of breath, and permanent airway hyper-reactivity, especially in children and seniors.
              </p>
            </div>

            {/* Recognized Scientific Citations */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[11px]">
                Authoritative Scientific Guidelines &amp; References
              </h4>
              <ul className="space-y-2.5 text-[#526161] text-[11px]">
                <li className="flex items-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-[#7BB350] shrink-0 mt-0.5" />
                  <div>
                    <strong>US EPA 402-F-08-004:</strong> Residential Air Cleaners — A Technical Summary. Focuses on True-HEPA single-pass efficiency and CADR calculations.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-[#7BB350] shrink-0 mt-0.5" />
                  <div>
                    <strong>ASHRAE Standard 62.2:</strong> Ventilation and Acceptable Indoor Air Quality in Residential Buildings. Standards for mechanical continuous and intermittent kitchen exhaust.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-[#7BB350] shrink-0 mt-0.5" />
                  <div>
                    <strong>WHO Guidelines for Indoor Air Quality (2010 &amp; 2014):</strong> Household Fuel Combustion and Selected Pollutants. Establishes risk profiles for biomass, benzene, formaldehyde, and carbon monoxide.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5 text-[#7BB350] shrink-0 mt-0.5" />
                  <div>
                    <strong>Cummings &amp; Waring (2020), Journal of Exposure Science &amp; Environmental Epidemiology:</strong> 'Potted plants do not improve indoor air quality: a review and analysis of reported VOC removal efficiencies'.
                  </div>
                </li>
              </ul>
            </div>

            {/* Footer Close */}
            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-[#111111] hover:bg-[#2b2b2b] text-white text-xs font-semibold px-5"
              >
                Close &amp; Return to Guidance
              </Button>
            </div>
          </div>
        </div>,
        document.body
      ) : null)}
    </>
  );
}
