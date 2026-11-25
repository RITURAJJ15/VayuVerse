import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://dicqyoxhplzobaxsnokz.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_ICsv07wg5QkTDY67-hT1YQ_Yk5mYmyA";

/**
 * Client-side Supabase instance.
 * Strictly uses the public anon/publishable key protected by Row-Level Security (RLS).
 * Never expose the service_role key to client-side bundles.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Expose supabase in browser console during development for testing
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}
