import { Sparkles } from "lucide-react";
import { ApprovedVayuMark } from "@/components/layout/sidebar";

interface BotanicalLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export function BotanicalLoadingScreen({
  message = "Harmonizing atmospheric telemetry...",
  subMessage = "Grounding your personalized air profile in verified data",
}: BotanicalLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen w-full bg-[#F7F7F0] text-[#202820] flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#DCE8D5]"
    >
      {/* Subtle organic background foliage glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#DCE8D5]/40 blur-3xl pointer-events-none animate-botanical-sunlight"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#9CBF88]/20 blur-3xl pointer-events-none animate-botanical-sunlight"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm space-y-5 animate-fade-in">
        {/* Animated Leaf Emblem */}
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-[#DCE8D5] flex items-center justify-center text-[#244936] shadow-sm animate-leaf-sway">
            <ApprovedVayuMark className="h-8 w-8 text-[#244936]" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#244936] text-[#F7F7F0] flex items-center justify-center shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#DCE8D5] animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-base font-bold tracking-tight text-[#202820]">
            {message}
          </h2>
          <p className="text-xs text-[#8A9085] leading-relaxed">
            {subMessage}
          </p>
        </div>

        {/* Subtle breathing bar */}
        <div className="w-32 h-1 bg-[#DCE8D5] rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-[#244936] rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
