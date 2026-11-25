import { supabase } from "./supabase";
import type {
  DbProfile,
  DbSavedLocation,
  DbSavedPlan,
  DbActionLog,
  ActionStatus,
} from "@/types/database";

/**
 * Privacy helper: Rounds latitude & longitude to 3 decimal places (~100m radius)
 * to comply with the requirement: "Use the app without storing exact location history".
 */
export function roundCoordinateForPrivacy(coord: number): number {
  return Number(coord.toFixed(3));
}

export const persistenceService = {
  // ----------------- Profile Management -----------------
  async upsertProfile(
    profile: Omit<DbProfile, "id" | "created_at" | "updated_at">
  ): Promise<{ data: DbProfile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: profile.user_id,
            display_name: profile.display_name,
            persona: profile.persona,
            preferences: profile.preferences,
            home_configuration: profile.home_configuration,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  async getProfile(
    userId: string
  ): Promise<{ data: DbProfile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  // ----------------- Saved Locations -----------------
  async saveLocation(
    userId: string,
    locationName: string,
    latitude: number,
    longitude: number
  ): Promise<{ data: DbSavedLocation | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("saved_locations")
        .insert({
          user_id: userId,
          location_name: locationName,
          rounded_latitude: roundCoordinateForPrivacy(latitude),
          rounded_longitude: roundCoordinateForPrivacy(longitude),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  async getSavedLocations(
    userId: string
  ): Promise<{ data: DbSavedLocation[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("saved_locations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: err as Error };
    }
  },

  async deleteSavedLocation(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from("saved_locations")
        .delete()
        .eq("id", id);
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  // ----------------- Saved Recommendation Plans -----------------
  async savePlan(
    userId: string,
    snapshot: DbSavedPlan["environmental_snapshot"],
    plan: DbSavedPlan["generated_plan"],
    profileId?: string | null,
    promptVersion: string = "v1.0"
  ): Promise<{ data: DbSavedPlan | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("saved_plans")
        .insert({
          user_id: userId,
          profile_id: profileId,
          environmental_snapshot: snapshot,
          generated_plan: plan,
          prompt_version: promptVersion,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  async getSavedPlans(
    userId: string
  ): Promise<{ data: DbSavedPlan[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("saved_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: err as Error };
    }
  },

  async deleteSavedPlan(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from("saved_plans").delete().eq("id", id);
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  // ----------------- Action Logs (Impact Tracker) -----------------
  async logAction(
    action: Omit<DbActionLog, "id" | "created_at">
  ): Promise<{ data: DbActionLog | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("action_logs")
        .insert({
          user_id: action.user_id,
          action_type: action.action_type,
          status: action.status,
          baseline_assumptions: action.baseline_assumptions,
          calculated_impact: action.calculated_impact,
          calculation_method: action.calculation_method,
          completed_at: action.completed_at,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  async getActionLogs(
    userId: string
  ): Promise<{ data: DbActionLog[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("action_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: err as Error };
    }
  },

  async updateActionStatus(
    id: string,
    status: ActionStatus,
    completedAt?: string | null
  ): Promise<{ data: DbActionLog | null; error: Error | null }> {
    try {
      const updatePayload: Partial<DbActionLog> = { status };
      if (status === "completed") {
        updatePayload.completed_at = completedAt || new Date().toISOString();
      } else if (status === "planned") {
        updatePayload.completed_at = null;
      }

      const { data, error } = await supabase
        .from("action_logs")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  async deleteActionLog(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from("action_logs").delete().eq("id", id);
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  },
};
