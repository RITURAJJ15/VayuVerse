import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  PERSISTENT_CHECKLIST_ITEMS,
  fetchUserChecklistState,
  persistUserChecklistState,
  type ChecklistItem,
} from "@/lib/indoor-guardian-service";

import type { IndoorRecommendation } from "@/types/indoor-air";

interface IndoorChecklistProps {
  recommendations?: IndoorRecommendation[];
}

export function IndoorChecklist({ recommendations }: IndoorChecklistProps = {}) {
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCost, setFilterCost] = useState<string>("all");

  const combinedItems: ChecklistItem[] = [
    ...(recommendations || []).map((r) => ({
      id: r.id,
      title: r.title,
      action: r.action,
      category: "habits" as const,
      costTier: r.costTier,
      priority: r.priority,
      details: r.whyThisHelps || r.scientificRationale,
    })),
    ...PERSISTENT_CHECKLIST_ITEMS.filter(
      (p) => !(recommendations || []).some((r) => r.id === p.id)
    ),
  ];

  // Load persistent checklist state on mount or user change
  useEffect(() => {
    let isSubscribed = true;
    async function load() {
      try {
        const state = await fetchUserChecklistState(user?.id);
        if (isSubscribed) {
          setCompletedIds(state || {});
        }
      } catch (err) {
        console.warn("[IndoorChecklist] Failed to load checklist state:", err);
      }
    }
    load();
    return () => {
      isSubscribed = false;
    };
  }, [user?.id]);

  const toggleDone = useCallback(
    (id: string) => {
      setCompletedIds((prev) => {
        const updated = { ...prev, [id]: !prev[id] };
        persistUserChecklistState(updated, user?.id);
        return updated;
      });
    },
    [user?.id]
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const costFilters = [
    { id: "all", label: "All Items" },
    { id: "Zero-Cost", label: "Zero-Cost Habits" },
    { id: "Low-Cost (<₹1,000)", label: "Low-Cost (<₹1,000)" },
    { id: "Moderate", label: "Moderate" },
    { id: "Investment", label: "Investment" },
  ];

  const filteredItems = combinedItems.filter((item) => {
    if (filterCost === "all") return true;
    return item.costTier === filterCost;
  });

  const completedCount = combinedItems.filter(
    (item) => completedIds[item.id]
  ).length;
  const progressPercent = Math.round(
    (completedCount / Math.max(1, combinedItems.length)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#D6D6D2]/60 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2E7D4E]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Section 2: Persistent Protection</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111111] mt-0.5">
            Personalized Indoor Protection Checklist
          </h2>
          <p className="text-xs text-[#626762] mt-0.5">
            My Indoor Protection Checklist: permanent physical upgrades and zero-cost habits saved to your profile
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-[#D6D6D2] shadow-2xs">
          <div className="text-right">
            <div className="text-xs font-bold text-[#111111]">
              {completedCount} of {combinedItems.length} Completed
            </div>
            <div className="text-[10px] text-[#626762]">{progressPercent}% Protected</div>
          </div>
          <div className="w-20 h-2 bg-[#EAEAEA] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2E7D4E] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs by Cost Tier */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 text-[#626762] shrink-0" />
        {costFilters.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterCost(tab.id)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterCost === tab.id
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#D6D6D2] bg-white text-[#626762] hover:bg-[#FAFAF8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isDone = Boolean(completedIds[item.id]);
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                isDone
                  ? "border-[#D1EB8F] bg-[#FAFAF8]/90"
                  : "border-[#D6D6D2] bg-white shadow-xs hover:border-[#111111]/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Interactive Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleDone(item.id)}
                    className="mt-0.5 text-[#111111] hover:text-[#2E7D4E] transition-colors focus:outline-none cursor-pointer"
                    aria-label={isDone ? `Mark ${item.title} as pending` : `Mark ${item.title} as completed`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-[#2E7D4E] fill-[#EDF6D5]" />
                    ) : (
                      <Circle className="h-5 w-5 text-[#A8B2A6]" />
                    )}
                  </button>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isDone ? "text-[#111111] line-through opacity-70" : "text-[#111111]"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF6D5] text-[#285A1D] border border-[#D1EB8F]">
                        {item.costTier}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF8] text-[#626762] border border-[#D6D6D2] uppercase">
                        {item.category}
                      </span>
                    </div>

                    <p className="text-xs text-[#626762] leading-relaxed">
                      {item.action}
                    </p>

                    {/* Expandable Evidence Details */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-[#D6D6D2]/60 text-xs text-[#626762] bg-[#FAFAF8] p-3 rounded-xl space-y-1">
                        <strong className="text-[#111111]">Evidence &amp; Implementation:</strong>
                        <p className="leading-relaxed">{item.details}</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="p-1 rounded-md text-[#626762] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                  aria-label={isExpanded ? "Collapse details" : "Expand details"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
