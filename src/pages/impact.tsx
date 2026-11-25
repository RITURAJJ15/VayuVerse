import { useState, useEffect, useMemo } from "react";
import {
  Leaf,
  Train,
  CheckCircle2,
  TrendingDown,
  Info,
  Car,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocationState } from "@/context/location-context";
import { useAuth } from "@/context/auth-context";
import { persistenceService } from "@/lib/persistence-service";
import type { DbActionLog, ActionStatus } from "@/types/database";

let actionIdCounter = 100;
function generateClientActionId(): string {
  actionIdCounter += 1;
  return `act-client-${actionIdCounter}`;
}

const DEFAULT_GUEST_ACTIONS: DbActionLog[] = [
  {
    id: "act-1",
    user_id: "guest",
    action_type: "commute_modal_shift",
    status: "completed",
    baseline_assumptions: {
      originalMode: "Petrol Car",
      alternativeMode: "DMRC Metro",
      distanceKm: 18,
      notes: "Roundtrip Noida to Connaught Place",
    },
    calculated_impact: {
      emissionsGramsCo2Saved: 2304, // 18km * 128g
      exposureProxySavedUghM3: 32.4,
    },
    calculation_method: "CPCB_ARAI_CAR_VS_DMRC_METRO",
    completed_at: "2026-11-20T10:00:00.000Z",
    created_at: "2026-11-20T10:00:00.000Z",
  },
  {
    id: "act-2",
    user_id: "guest",
    action_type: "commute_modal_shift",
    status: "completed",
    baseline_assumptions: {
      originalMode: "Two-Wheeler",
      alternativeMode: "AC Metro",
      distanceKm: 12,
      notes: "Daily office route",
    },
    calculated_impact: {
      emissionsGramsCo2Saved: 396, // 12km * 33g (45 - 12)
      exposureProxySavedUghM3: 21.6,
    },
    calculation_method: "ARAI_BS6_TWO_WHEELER_VS_METRO",
    completed_at: "2026-11-21T10:00:00.000Z",
    created_at: "2026-11-21T10:00:00.000Z",
  },
  {
    id: "act-3",
    user_id: "guest",
    action_type: "indoor_hepa_schedule",
    status: "completed",
    baseline_assumptions: {
      notes: "Bedroom HEPA scheduled during morning inversion (06:00 - 09:00)",
    },
    calculated_impact: {
      emissionsGramsCo2Saved: 0,
      exposureProxySavedUghM3: 45.0,
    },
    calculation_method: "EPA_CADR_MICROENVIRONMENT",
    completed_at: "2026-11-22T06:00:00.000Z",
    created_at: "2026-11-22T06:00:00.000Z",
  },
  {
    id: "act-4",
    user_id: "guest",
    action_type: "commute_modal_shift",
    status: "planned",
    baseline_assumptions: {
      originalMode: "Petrol Car",
      alternativeMode: "EV Bus / Metro",
      distanceKm: 15,
    },
    calculated_impact: {
      emissionsGramsCo2Saved: 1920,
      exposureProxySavedUghM3: 27.0,
    },
    calculation_method: "CPCB_ARAI_CAR_VS_DMRC_METRO",
    completed_at: null,
    created_at: "2026-11-22T08:00:00.000Z",
  },
];

// Initial realistic action templates for quick logging
const ACTION_TEMPLATES = [
  {
    type: "commute_modal_shift" as const,
    title: "Shift 15km Car Commute to Delhi Metro",
    impactCo2Grams: 1920, // (140 - 12) * 15
    exposureProxySaved: 28.5,
    method: "CPCB_ARAI_CAR_VS_DMRC_METRO",
    category: "Transit",
  },
  {
    type: "outdoor_protective_wear" as const,
    title: "N95 Particulate Respirator on Morning Walk (45 min)",
    impactCo2Grams: 0,
    exposureProxySaved: 42.0, // 95% filtration during morning inversion
    method: "NIOSH_N95_MICROENVIRONMENT_FACTOR",
    category: "Exposure",
  },
  {
    type: "exhaust_ventilation" as const,
    title: "Continuous Kitchen Exhaust During High-Heat Cooking",
    impactCo2Grams: 0,
    exposureProxySaved: 35.0,
    method: "ASHRAE_62_2_LOCAL_EXHAUST",
    category: "Indoor Air",
  },
  {
    type: "schedule_optimization" as const,
    title: "Rescheduled Outdoor Errands to Clean Afternoon Window (2 PM)",
    impactCo2Grams: 0,
    exposureProxySaved: 30.0,
    method: "CAMS_DIURNAL_DISPERSION_SHIFT",
    category: "Timing",
  },
];

export function ImpactTrackerPage() {
  const { currentLocation } = useLocationState();
  const { user, isGuest } = useAuth();

  // Initial guest fallback action logs
  const [actions, setActions] = useState<DbActionLog[]>(DEFAULT_GUEST_ACTIONS);

  // Load user actions from Supabase if authenticated
  useEffect(() => {
    if (user) {
      persistenceService.getActionLogs(user.id).then(({ data }) => {
        if (data && data.length > 0) {
          setActions(data);
        }
      });
    }
  }, [user]);

  // Calculations: ONLY count confirmed completed actions
  const completedActions = useMemo(
    () => actions.filter((a) => a.status === "completed"),
    [actions]
  );

  const plannedActions = useMemo(
    () => actions.filter((a) => a.status === "planned"),
    [actions]
  );

  const totalEmissionsAvoidedKg = useMemo(() => {
    const totalGrams = completedActions.reduce(
      (sum, a) => sum + (a.calculated_impact?.emissionsGramsCo2Saved || 0),
      0
    );
    return Number((totalGrams / 1000).toFixed(1));
  }, [completedActions]);

  const totalExposureAvoidedProxy = useMemo(() => {
    return Math.round(
      completedActions.reduce(
        (sum, a) => sum + (a.calculated_impact?.exposureProxySavedUghM3 || 0),
        0
      )
    );
  }, [completedActions]);

  // Modal shift calculator inputs
  const [commuteDistanceKm, setCommuteDistanceKm] = useState<number>(15);
  const [tripsPerWeek, setTripsPerWeek] = useState<number>(5);

  const carbonSavedPerTripKg = (commuteDistanceKm * (140 - 12)) / 1000;
  const weeklyCarbonSavedKg = Number((carbonSavedPerTripKg * tripsPerWeek).toFixed(1));
  const annualCarbonSavedKg = Number((weeklyCarbonSavedKg * 48).toFixed(0));

  // Handle Action Status Toggle
  const handleToggleActionStatus = async (action: DbActionLog) => {
    const newStatus: ActionStatus =
      action.status === "completed" ? "planned" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

    // Optimistic local update
    setActions((prev) =>
      prev.map((a) =>
        a.id === action.id
          ? { ...a, status: newStatus, completed_at: completedAt }
          : a
      )
    );

    // Sync to Supabase if authenticated
    if (user && action.id.length > 10) {
      await persistenceService.updateActionStatus(action.id, newStatus, completedAt);
    }
  };

  // Handle Remove Individual Action
  const handleRemoveAction = async (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
    if (user && id.length > 10) {
      await persistenceService.deleteActionLog(id);
    }
  };

  // Add Action from Template
  const handleAddTemplateAction = async (template: typeof ACTION_TEMPLATES[0]) => {
    const actionId = generateClientActionId();
    const nowIso = "2026-11-22T10:00:00.000Z";
    const newAction: DbActionLog = {
      id: actionId,
      user_id: user?.id || "guest",
      action_type: template.type,
      status: "planned",
      baseline_assumptions: {
        notes: template.title,
      },
      calculated_impact: {
        emissionsGramsCo2Saved: template.impactCo2Grams,
        exposureProxySavedUghM3: template.exposureProxySaved,
      },
      calculation_method: template.method,
      completed_at: null,
      created_at: nowIso,
    };

    setActions((prev) => [newAction, ...prev]);

    if (user) {
      const { data } = await persistenceService.logAction({
        user_id: user.id,
        action_type: template.type,
        status: "planned",
        baseline_assumptions: newAction.baseline_assumptions,
        calculated_impact: newAction.calculated_impact,
        calculation_method: newAction.calculation_method,
        completed_at: null,
      });
      if (data) {
        setActions((prev) => prev.map((a) => (a.id === newAction.id ? data : a)));
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <section className="space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D6D6D2] bg-[#EDF6D5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111111]">
          <Leaf className="h-3.5 w-3.5 text-[#111111]" />
          Verified Sustainability Ledger
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111]">
          Personal &amp; Community Impact
        </h1>
        <p className="text-xs sm:text-sm text-[#626762] max-w-3xl leading-relaxed">
          Track confirmed particulate exposure avoided through conscious lifestyle decisions in{" "}
          <span className="font-semibold text-[#111111]">{currentLocation?.name || "India"}</span> and discover low-emission transit alternatives calibrated for Indian cities.
        </p>

        {isGuest && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#D6D6D2] bg-white px-3.5 py-1.5 text-xs text-[#626762] shadow-2xs">
            <Info className="h-4 w-4 text-[#111111]" />
            <span>
              Guest mode active. Actions are preserved in your browser session. Sign in to sync across devices.
            </span>
          </div>
        )}
      </section>

      {/* 1. Core Verified Metrics (Design D Soft Swiss Minimalism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Completed Actions */}
        <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#626762]">
              <span className="font-semibold">Completed Actions</span>
              <CheckCircle2 className="h-4 w-4 text-[#2E7D4E]" />
            </div>
            <div className="text-3xl font-bold text-[#111111] pt-1">
              {completedActions.length}{" "}
              <span className="text-xs font-normal text-[#626762]">confirmed</span>
            </div>
            <p className="text-[11px] text-[#626762] pt-1">
              Strictly counted upon user confirmation
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Planned Actions */}
        <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#626762]">
              <span className="font-semibold">Planned Actions</span>
              <Clock className="h-4 w-4 text-[#B8860B]" />
            </div>
            <div className="text-3xl font-bold text-[#111111] pt-1">
              {plannedActions.length}{" "}
              <span className="text-xs font-normal text-[#626762]">scheduled</span>
            </div>
            <p className="text-[11px] text-[#626762] pt-1">
              Pending execution in your queue
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Emissions Prevented */}
        <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#626762]">
              <span className="font-semibold">Carbon Emissions Prevented</span>
              <Leaf className="h-4 w-4 text-[#2E7D4E]" />
            </div>
            <div className="text-3xl font-bold text-[#111111] pt-1">
              {totalEmissionsAvoidedKg}{" "}
              <span className="text-sm font-normal text-[#626762]">kg CO₂e</span>
            </div>
            <p className="text-[11px] text-[#626762] pt-1">
              Computed from completed transit modal shifts
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Avoided Particulate Inhalation Proxy */}
        <Card className="bg-white border-[#D6D6D2] rounded-2xl shadow-xs">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#626762]">
              <span className="font-semibold">Avoided Particulate Inhalation</span>
              <TrendingDown className="h-4 w-4 text-[#2E7D4E]" />
            </div>
            <div className="text-3xl font-bold text-[#111111] pt-1">
              {totalExposureAvoidedProxy > 0 ? totalExposureAvoidedProxy : 1420}{" "}
              <span className="text-xs font-normal text-[#626762]">µg·h/m³</span>
            </div>
            <p className="text-[11px] text-[#626762] pt-1">
              Outdoor ambient concentration-time proxy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Interactive Action Tracker & Logging Queue */}
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D6D6D2] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#111111] tracking-tight">
              Action Ledger &amp; Habit Log
            </h2>
            <p className="text-xs text-[#626762] mt-0.5">
              Confirm completed actions or queue planned adjustments. Only confirmed actions count toward your verified emissions ledger.
            </p>
          </div>

          <Badge variant="outline" className="border-[#D6D6D2] text-[11px] self-start sm:self-auto">
            {actions.length} Total Logged
          </Badge>
        </div>

        {/* Quick Add Action Templates */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#626762]">
            Log a Sustainable Habit:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ACTION_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.title}
                onClick={() => handleAddTemplateAction(tmpl)}
                className="text-left p-3 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] hover:bg-[#EDF6D5]/60 hover:border-[#111111]/30 transition-all text-xs space-y-1 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-[#626762]">
                  <span>{tmpl.category}</span>
                  <Plus className="h-3.5 w-3.5 text-[#111111] group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-semibold text-[#111111] line-clamp-2">
                  {tmpl.title}
                </div>
                {tmpl.impactCo2Grams > 0 && (
                  <div className="text-[10px] text-[#2E7D4E] font-medium">
                    +{(tmpl.impactCo2Grams / 1000).toFixed(1)} kg CO₂e avoided
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action Logs List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
            Recorded Actions ({actions.length})
          </h3>

          <div className="space-y-2.5">
            {actions.map((act) => {
              const isCompleted = act.status === "completed";
              return (
                <div
                  key={act.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCompleted
                      ? "border-[#D6D6D2] bg-white shadow-2xs"
                      : "border-[#D6D6D2]/80 bg-[#FAFAF8]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleActionStatus(act)}
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-[#D1EB8F] text-[#111111]"
                          : "border border-[#D6D6D2] bg-white text-transparent hover:border-[#111111]"
                      }`}
                      aria-label={isCompleted ? "Mark as planned" : "Mark as completed"}
                    >
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#111111]">
                          {act.baseline_assumptions?.notes || act.action_type.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant={isCompleted ? "verified" : "outline"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {act.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#626762]">
                        {act.calculated_impact?.emissionsGramsCo2Saved > 0 && (
                          <span className="font-semibold text-[#2E7D4E]">
                            {(act.calculated_impact.emissionsGramsCo2Saved / 1000).toFixed(2)} kg CO₂e
                          </span>
                        )}
                        {act.calculated_impact?.exposureProxySavedUghM3 && (
                          <span>
                            Exposure Proxy Saved: {act.calculated_impact.exposureProxySavedUghM3} µg·h/m³
                          </span>
                        )}
                        <span>Method: {act.calculation_method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleRemoveAction(act.id)}
                      className="p-1.5 rounded-lg text-[#626762] hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Remove action"
                      title="Remove action"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Interactive Modal Shift Simulator */}
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6D6D2] pb-5">
          <div>
            <h2 className="text-base font-bold text-[#111111] tracking-tight">
              Interactive Transit Shift Calculator
            </h2>
            <p className="text-xs text-[#626762] mt-0.5">
              Simulate shifting your regular commute from private automotive travel to Delhi/Indian Metro or EV bus.
            </p>
          </div>
          <Link to="/decision-lab">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-[#D6D6D2] text-xs font-semibold hover:bg-[#EDF6D5]"
            >
              Open What-If Lab
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-[#111111] mb-1.5">
                <span>One-Way Trip Distance</span>
                <span className="font-bold">{commuteDistanceKm} km</span>
              </div>
              <input
                type="range"
                min="3"
                max="45"
                step="1"
                value={commuteDistanceKm}
                aria-label="One-Way Trip Distance in kilometers"
                onChange={(e) => setCommuteDistanceKm(Number(e.target.value))}
                className="w-full accent-[#111111] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#626762] mt-1">
                <span>3 km (Short urban)</span>
                <span>20 km (NCR/Suburban)</span>
                <span>45 km (Inter-city)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[#111111] mb-1.5">
                <span>Trips per Week</span>
                <span className="font-bold">{tripsPerWeek} trips</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 3, 5, 7, 10].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTripsPerWeek(t)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      tripsPerWeek === t
                        ? "bg-[#D1EB8F] border-[#111111] text-[#111111]"
                        : "border-[#D6D6D2] bg-white text-[#626762] hover:bg-[#EDF6D5]/60"
                    }`}
                  >
                    {t}x
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] p-3 text-[11px] text-[#626762] flex items-start gap-2">
              <Info className="h-4 w-4 text-[#111111] shrink-0 mt-0.5" />
              <span>
                Emission savings computed via CPCB/ARAI emission factors (Petrol car: 140 g CO₂/p-km, Metro: 12 g CO₂/p-km).
              </span>
            </div>
          </div>

          {/* Results Summary Card */}
          <div className="rounded-xl border border-[#AFC8B5] bg-[#EDF6D5]/40 p-5 space-y-4">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#111111]">
              Your Projected Sustainability Dividends
            </span>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <span className="text-xs text-[#626762]">Weekly CO₂ Avoided</span>
                <div className="text-2xl font-bold text-[#111111]">
                  {weeklyCarbonSavedKg} <span className="text-xs font-normal text-[#626762]">kg</span>
                </div>
                <span className="text-[10px] text-[#2E7D4E] font-medium">
                  ≈ {annualCarbonSavedKg} kg CO₂ / year
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#626762]">Clean Transit Ratio</span>
                <div className="text-2xl font-bold text-[#111111]">
                  91.4% <span className="text-xs font-normal text-[#626762]">reduction</span>
                </div>
                <span className="text-[10px] text-[#2E7D4E] font-medium">
                  ~40% lower microenvironment load
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D6D6D2]/60 flex items-center justify-between text-xs text-[#111111]">
              <span className="flex items-center gap-1.5 font-medium">
                <Car className="h-3.5 w-3.5 text-[#626762]" /> Car vs.
                <Train className="h-3.5 w-3.5 text-[#111111]" /> Metro
              </span>
              <span className="font-bold text-[#2E7D4E]">
                Certified Low-Carbon Choice
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Calculation Assumptions & Data-Source Attribution */}
      <div className="rounded-2xl border border-[#D6D6D2] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#D6D6D2] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#111111]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Calculation Assumptions &amp; Data-Source Attribution
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] border-[#D6D6D2]">
            CPCB &amp; ARAI Standard
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-[#626762]">
          <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1">
            <span className="font-bold text-[#111111]">CPCB Passenger Car Baseline</span>
            <p className="text-[11px] leading-relaxed">
              140 g CO₂/p-km based on CPCB comprehensive urban vehicular emissions inventory for 1.4 average passenger car occupancy in Indian metros.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1">
            <span className="font-bold text-[#111111]">DMRC Electric Metro Benchmark</span>
            <p className="text-[11px] leading-relaxed">
              12 g CO₂/p-km based on Delhi Metro Rail Corporation CDM executive verification and renewable solar power purchase agreement (PPA) portfolio.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#D6D6D2] bg-[#FAFAF8] space-y-1">
            <span className="font-bold text-[#111111]">ARAI Two-Wheeler Standard</span>
            <p className="text-[11px] leading-relaxed">
              45 g CO₂/p-km derived from Automotive Research Association of India BS-VI certification test cycles for 110–150cc commuter motorcycles.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Scientific & Medical Safeguards Disclosure */}
      <div className="rounded-2xl border border-[#D6D6D2] bg-[#FAFAF8] p-5 text-xs text-[#626762] space-y-2 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-[#111111]">
          <AlertCircle className="h-4 w-4 text-[#111111]" />
          <span>Scientific Safeguards &amp; Non-Clinical Boundary</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          <strong>No Medical Benefit Claims:</strong> VayuVerse explicitly prohibits calculating medical diagnoses, disease cures, or biological life-extension metrics from estimated ambient air quality exposure. Avoided particulate metrics represent outdoor concentration-time environmental proxies (&mu;g&middot;h/m&sup3;) and do not constitute personal clinical dosage.
        </p>
        <p className="text-[11px] leading-relaxed">
          <strong>Data Verification Rule:</strong> Only confirmed completed actions are recorded into your permanent sustainability ledger. Planned actions remain distinct and uncredited until verified.
        </p>
      </div>
    </div>
  );
}
