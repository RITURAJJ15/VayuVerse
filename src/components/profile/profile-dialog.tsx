import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { User, Check, X, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PresetSelector } from "./preset-selector";
import { useProfileState } from "@/context/profile-context";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { CATEGORY_LABELS } from "@/types/profile";

export function ProfileDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { currentProfile, activePreset } = useProfileState();

  // Focus trap, initial focus, escape listener, and body scroll lock
  const { modalContainerRef } = useModalA11y({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleOpenSettings = () => {
    onClose();
    navigate("/profile");
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#111111]/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-dialog-title"
          aria-describedby="profile-dialog-desc"
          tabIndex={-1}
          className="relative w-full max-w-2xl my-auto transform rounded-2xl border border-[#D6D6D2] bg-white text-left shadow-2xl transition-all max-h-[90vh] flex flex-col focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D6D6D2] px-4 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF6D5] text-[#111111]">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="profile-dialog-title"
                    className="text-sm font-bold tracking-tight text-[#111111]"
                  >
                    Personalization &amp; Evaluator Presets
                  </h2>
                  <Badge variant="sage" className="text-[9px]">
                    Guest Session
                  </Badge>
                </div>
                <p id="profile-dialog-desc" className="text-xs text-[#626762]">
                  Switch persona to calibrate daily routine and fetch city telemetry
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#626762] hover:bg-[#FAFAF8] hover:text-[#111111] transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Current Persona Summary */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8]">
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#626762] uppercase font-mono block font-bold">
                  Currently Active Persona
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#111111]">
                    {currentProfile.displayName}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABELS[currentProfile.category]}
                  </Badge>
                </div>
                <div className="text-[11px] text-[#626762]">
                  Schedule: {currentProfile.departureTime} – {currentProfile.returnTime} • {currentProfile.sensitivity} sensitivity
                </div>
              </div>

              {activePreset && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D4E]">
                  <Check className="h-3.5 w-3.5" />
                  Synced: {activePreset.cityName}
                </span>
              )}
            </div>

            {/* Preset Selector */}
            <div>
              <PresetSelector onSelect={() => onClose()} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#D6D6D2] px-4 sm:px-6 py-3.5 bg-[#FAFAF8] shrink-0">
            <button
              onClick={handleOpenSettings}
              className="text-xs text-[#111111] hover:underline flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-[#626762]" />
              Full Profile &amp; Timing Settings
            </button>

            <Button variant="softgreen" size="sm" onClick={onClose} className="rounded-lg cursor-pointer">
              Done
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
