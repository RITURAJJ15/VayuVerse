import { supabase } from "./supabase";
import type { RouteTravelMode } from "@/types/routes";

export interface SavedCommute {
  id: string;
  user_id?: string;
  route_nickname: string;
  origin_name: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
  travel_mode: RouteTravelMode;
  departure_time?: string;
  days_of_week?: string[];
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = "vayuverse_guest_saved_commutes_v1";

function getLocalCommutes(): SavedCommute[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCommutes(commutes: SavedCommute[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(commutes));
  } catch {
    // ignore
  }
}

export async function fetchSavedCommutes(userId?: string | null): Promise<SavedCommute[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("saved_commutes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[SavedCommutes] Supabase fetch error, falling back to local:", error.message);
        return getLocalCommutes();
      }
      return data || [];
    } catch {
      return getLocalCommutes();
    }
  }

  return getLocalCommutes();
}

export async function createSavedCommute(
  commute: Omit<SavedCommute, "id" | "created_at" | "updated_at">,
  userId?: string | null
): Promise<SavedCommute> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("saved_commutes")
        .insert({
          user_id: userId,
          route_nickname: commute.route_nickname,
          origin_name: commute.origin_name,
          origin_latitude: commute.origin_latitude,
          origin_longitude: commute.origin_longitude,
          destination_name: commute.destination_name,
          destination_latitude: commute.destination_latitude,
          destination_longitude: commute.destination_longitude,
          travel_mode: commute.travel_mode,
          departure_time: commute.departure_time,
          days_of_week: commute.days_of_week,
        })
        .select()
        .single();

      if (error) {
        console.warn("[SavedCommutes] Supabase insert failed, saving locally:", error.message);
      } else if (data) {
        return data;
      }
    } catch (err) {
      console.warn("[SavedCommutes] Exception during insert:", err);
    }
  }

  // Local storage fallback for guest mode or offline
  const newCommute: SavedCommute = {
    ...commute,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = getLocalCommutes();
  list.unshift(newCommute);
  saveLocalCommutes(list);
  return newCommute;
}

export async function deleteSavedCommute(id: string, userId?: string | null): Promise<boolean> {
  if (userId && !id.startsWith("local-")) {
    try {
      const { error } = await supabase
        .from("saved_commutes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.warn("[SavedCommutes] Supabase delete error:", error.message);
      }
    } catch (err) {
      console.warn("[SavedCommutes] Delete exception:", err);
    }
  }

  const list = getLocalCommutes().filter((c) => c.id !== id);
  saveLocalCommutes(list);
  return true;
}
