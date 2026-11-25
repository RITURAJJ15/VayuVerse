import { useState } from "react";
import {
  Sun,
  CloudSun,
  Sunset,
  Sparkles,
  RotateCw,
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DayPlanResponse, RecommendationAction } from "@/types/recommendations";
import { cn } from "@/lib/cn";

interface DayTimelineProps {
  data?: DayPlanResponse;
  isLoading: boolean;
  isFetching?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  selectedCityName?: string;
}

export function DayTimeline({
  data,
  isLoading,
  isFetching,
  error,
  onRefresh,
  selectedCityName = "this city",
}: DayTimelineProps) {
  // Local state for interactive actions: planned and dismissed IDs
  const [plannedIds, setPlannedIds] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [expandedRationale, setExpandedRationale] = useState<Record<string, boolean>>({});

  const togglePlanned = (id: string) => {
    setPlannedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const dismissAction = (id: string) => {
    setDismissedIds((prev) => ({ ...prev, [id]: true }));
  };

  const toggleRationale = (id: string) => {
    setExpandedRationale((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // State 1: Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[#D6D6D2] bg-white p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // State 2: Error
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-8 text-center space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF6D5] text-[#111111]">
          <Info className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-[#111111]">
          Unable to generate personalized day plan
        </h3>
        <p className="text-xs text-[#626762] max-w-md mx-auto">
          {error?.message || "Please select an active Indian city with valid coordinates to generate clean-air guidance."}
        </p>
        {onRefresh && (
          <Button
            size="sm"
            onClick={onRefresh}
            className="rounded-full bg-[#D1EB8F] hover:bg-[#c2e078] text-[#111111] text-xs font-semibold px-5"
          >
            <RotateCw className="h-3 w-3 mr-1.5" />
            Generate Guidance
          </Button>
        )}
      </div>
    );
  }

  const { sections, isAiGenerated, fallbackReason } = data;

  const renderActionCard = (action: RecommendationAction) => {
    if (dismissedIds[action.id]) return null;

    const isPlanned = Boolean(plannedIds[action.id]);
    const isExpanded = Boolean(expandedRationale[action.id]);

    return (
      <div
        key={action.id}
        className={cn(
          "rounded-xl border p-4 transition-all duration-150 space-y-3",
          isPlanned
            ? "border-[#AFC8B5] bg-[#EDF6D5]/40"
            : "border-[#D6D6D2] bg-white hover:border-[#111111]/30"
        )}
      >
        {/* Top Header of Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#111111]">{action.title}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FAFAF8] border border-[#D6D6D2] text-[10px] text-[#626762] font-mono">
                {action.timeWindow}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#EDF6D5] text-[10px] text-[#111111] font-semibold uppercase tracking-wider">
                {action.actionCategory.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-[#111111] leading-relaxed font-medium pt-0.5">
              {action.action}
            </p>
          </div>

          {/* Action triggers: Mark as Planned & Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => togglePlanned(action.id)}
              className={cn(
                "p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer",
                isPlanned
                  ? "bg-[#D1EB8F] border-[#AFC8B5] text-[#111111]"
                  : "border-[#D6D6D2] bg-white text-[#626762] hover:text-[#111111] hover:bg-[#EDF6D5]/50"
              )}
              title={isPlanned ? "Planned for today" : "Mark as planned"}
            >
              {isPlanned ? (
                <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span className="text-[11px] hidden sm:inline">
                {isPlanned ? "Planned" : "Plan"}
              </span>
            </button>

            <button
              onClick={() => dismissAction(action.id)}
              className="p-1.5 rounded-lg text-[#626762] hover:text-[#B93838] hover:bg-[#FBF3F3] transition-colors cursor-pointer"
              title="Dismiss recommendation"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible "Why recommended" Explanation */}
        <div className="pt-2 border-t border-[#D6D6D2]/60">
          <button
            onClick={() => toggleRationale(action.id)}
            className="flex items-center justify-between w-full text-[11px] text-[#626762] hover:text-[#111111] cursor-pointer"
          >
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Why recommended &amp; evidence
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-2 text-[11px] text-[#626762] animate-fade-in">
              <p className="leading-relaxed bg-[#FAFAF8] p-2.5 rounded-lg border border-[#D6D6D2]/80">
                {action.explanation}
              </p>

              {/* Evidence References */}
              {action.evidenceReferences && action.evidenceReferences.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[#626762]/70 font-semibold uppercase">
                    Evidence:
                  </span>
                  {action.evidenceReferences.map((ref, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#EDF6D5]/80 text-[#111111] text-[10px] font-mono border border-[#AFC8B5]/40"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              )}

              {/* Limitations & Confidence */}
              <div className="flex items-center justify-between text-[10px] text-[#626762]/80 pt-1">
                <span>Confidence: <strong className="text-[#111111]">{action.confidenceLevel}</strong></span>
                <span className="italic truncate max-w-[280px]">Note: {action.limitations}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Engine Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#D6D6D2] bg-white shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDF6D5] text-[#111111]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111111]">
                {isAiGenerated ? "Personalized Clean-Air Plan Active" : "Data-Based Recommendations Active"}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                  isAiGenerated
                    ? "bg-[#D1EB8F] text-[#111111]"
                    : "bg-[#FAFAF8] border border-[#D6D6D2] text-[#626762]"
                )}
              >
                {isAiGenerated ? "VayuVerse Intelligence" : "Verified Environmental Rules"}
              </span>
            </div>
            <p className="text-[11px] text-[#626762]">
              {isAiGenerated
                ? `Personalized recommendations for ${selectedCityName} synthesized strictly from verified OpenAQ & CAMS inputs.`
                : fallbackReason || "Grounded strictly in verified CPCB ambient thresholds and boundary layer physics."}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D6D6D2] bg-white hover:bg-[#EDF6D5] text-xs font-medium text-[#111111] cursor-pointer self-start sm:self-auto"
          >
            <RotateCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            <span>{isFetching ? "Regenerating..." : "Regenerate Plan"}</span>
          </button>
        )}
      </div>

      {/* 3 Diurnal Sections: Morning, Afternoon, Evening */}
      <div className="space-y-6">
        {/* 1. Morning Section */}
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D6D2] pb-3">
            <div className="flex items-center gap-2.5">
              <Sun className="h-5 w-5 text-[#111111]" />
              <div>
                <h3 className="text-base font-bold text-[#111111]">{sections.morning.title}</h3>
                <p className="text-[11px] text-[#626762]">{sections.morning.atmosphericContext}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#626762] bg-[#FAFAF8] px-2.5 py-1 rounded-full border border-[#D6D6D2]">
              {sections.morning.timeRange}
            </span>
          </div>

          <div className="space-y-3">
            {sections.morning.recommendations.map(renderActionCard)}
          </div>
        </div>

        {/* 2. Afternoon Section */}
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D6D2] pb-3">
            <div className="flex items-center gap-2.5">
              <CloudSun className="h-5 w-5 text-[#111111]" />
              <div>
                <h3 className="text-base font-bold text-[#111111]">{sections.afternoon.title}</h3>
                <p className="text-[11px] text-[#626762]">{sections.afternoon.atmosphericContext}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#626762] bg-[#FAFAF8] px-2.5 py-1 rounded-full border border-[#D6D6D2]">
              {sections.afternoon.timeRange}
            </span>
          </div>

          <div className="space-y-3">
            {sections.afternoon.recommendations.map(renderActionCard)}
          </div>
        </div>

        {/* 3. Evening Section */}
        <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D6D2] pb-3">
            <div className="flex items-center gap-2.5">
              <Sunset className="h-5 w-5 text-[#111111]" />
              <div>
                <h3 className="text-base font-bold text-[#111111]">{sections.evening.title}</h3>
                <p className="text-[11px] text-[#626762]">{sections.evening.atmosphericContext}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#626762] bg-[#FAFAF8] px-2.5 py-1 rounded-full border border-[#D6D6D2]">
              {sections.evening.timeRange}
            </span>
          </div>

          <div className="space-y-3">
            {sections.evening.recommendations.map(renderActionCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
