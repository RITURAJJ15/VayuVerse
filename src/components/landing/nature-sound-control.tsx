import { useEffect, useState } from "react";
import { VolumeX, Sparkles } from "lucide-react";
import { natureAudio, type SoundState } from "@/lib/nature-audio";

export function NatureSoundControl() {
  const [soundState, setSoundState] = useState<SoundState>("muted");

  useEffect(() => {
    // Attempt non-intrusive initialization
    void natureAudio.init();

    // Subscribe to state changes (playing, muted, needs_interaction)
    const unsubscribe = natureAudio.subscribe((state) => {
      setSoundState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClick = () => {
    if (soundState === "needs_interaction" || soundState === "muted") {
      void natureAudio.enableSound();
    } else {
      natureAudio.mute();
    }
  };

  const isPlaying = soundState === "playing";
  const needsInteraction = soundState === "needs_interaction";

  return (
    <div className="fixed bottom-5 right-5 z-40 animate-fade-in select-none">
      <button
        onClick={handleClick}
        className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-full border transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#244936]/40 ${
          isPlaying
            ? "bg-[#244936] border-[#244936] text-[#F7F7F0] shadow-[#244936]/20"
            : needsInteraction
            ? "bg-white/90 border-[#9CBF88] text-[#244936] hover:bg-[#DCE8D5]/60 ring-2 ring-[#9CBF88]/30 animate-pulse"
            : "bg-white/80 border-[#D6D6D2] text-[#526B4B] hover:text-[#244936] hover:bg-white"
        }`}
        aria-label={
          isPlaying
            ? "Mute nature ambient sound"
            : needsInteraction
            ? "Enable nature ambient sound"
            : "Unmute nature ambient sound"
        }
        title={
          isPlaying
            ? "Nature sound active (Click to mute)"
            : needsInteraction
            ? "Click to enable peaceful breeze and rustling leaves"
            : "Nature sound muted (Click to play)"
        }
      >
        {isPlaying ? (
          <>
            {/* Animated Audio Equalizer Bars */}
            <div className="flex items-center gap-0.5 h-3.5 w-3.5" aria-hidden="true">
              <span className="w-0.5 bg-current rounded-full animate-[soundbar_0.8s_ease-in-out_infinite] h-2" />
              <span className="w-0.5 bg-current rounded-full animate-[soundbar_1.1s_ease-in-out_infinite_0.2s] h-3.5" />
              <span className="w-0.5 bg-current rounded-full animate-[soundbar_0.9s_ease-in-out_infinite_0.4s] h-2.5" />
            </div>
            <span className="text-xs font-semibold tracking-tight">Sound On</span>
          </>
        ) : needsInteraction ? (
          <>
            <Sparkles className="h-3.5 w-3.5 text-[#526B4B] shrink-0" />
            <span className="text-xs font-bold text-[#244936] tracking-tight">
              Enable nature sounds
            </span>
          </>
        ) : (
          <>
            <VolumeX className="h-3.5 w-3.5 text-[#8A9085] shrink-0 group-hover:text-[#244936]" />
            <span className="text-xs font-semibold text-[#8A9085] group-hover:text-[#244936] tracking-tight">
              Sound Muted
            </span>
          </>
        )}
      </button>
    </div>
  );
}
