-- ==============================================================================
-- VayuVerse Production Database Schema Migration
-- Compatible with PostgreSQL 15+ / Supabase PostgREST
-- Transactional, idempotent, hardened RLS, and PostgREST schema reload
-- ==============================================================================

BEGIN;

-- Enable cryptographic extensions for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Table Definitions
-- ==============================================================================

-- 1.1 Profiles Table (Personalization, lifestyle archetypes, home configuration)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  persona TEXT CHECK (persona IS NULL OR persona IN (
    'college_student',
    'office_commuter',
    'parent_children',
    'senior_citizen',
    'general_individual',
    'family_household'
  )),
  preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
  home_configuration JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT profiles_id_user_id_uq UNIQUE (id, user_id)
);

-- 1.2 Saved Locations Table (Privacy-preserving rounded coordinates for telemetry)
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  rounded_latitude NUMERIC(8,3) NOT NULL,
  rounded_longitude NUMERIC(8,3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 1.3 Saved Plans Table (Snapshot of environmental telemetry and AI routine)
CREATE TABLE IF NOT EXISTS public.saved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID,
  environmental_snapshot JSONB NOT NULL,
  generated_plan JSONB NOT NULL,
  prompt_version TEXT DEFAULT 'v1.0' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_saved_plans_profile_user FOREIGN KEY (profile_id, user_id) 
    REFERENCES public.profiles(id, user_id) ON DELETE SET NULL (profile_id)
);

-- 1.4 Action Logs Table (Verified sustainability ledger for Impact Tracker)
CREATE TABLE IF NOT EXISTS public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'completed', 'dismissed')),
  baseline_assumptions JSONB DEFAULT '{}'::jsonb NOT NULL,
  calculated_impact JSONB DEFAULT '{}'::jsonb NOT NULL,
  calculation_method TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 1.5 Saved Commutes Table (Frequent daily origin/destination coordinates)
CREATE TABLE IF NOT EXISTS public.saved_commutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route_nickname TEXT NOT NULL,
  origin_name TEXT NOT NULL,
  origin_latitude NUMERIC(9,6) NOT NULL,
  origin_longitude NUMERIC(9,6) NOT NULL,
  destination_name TEXT NOT NULL,
  destination_latitude NUMERIC(9,6) NOT NULL,
  destination_longitude NUMERIC(9,6) NOT NULL,
  travel_mode TEXT NOT NULL DEFAULT 'DRIVE',
  departure_time TEXT,
  days_of_week TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 2. Indexes for Query Performance & User Filtering
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON public.saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_plans_user_id ON public.saved_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id_status ON public.action_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_commutes_user_id ON public.saved_commutes(user_id);

-- ==============================================================================
-- 3. Hardened Trigger Functions
-- ==============================================================================

-- 3.1 Updated-at trigger function (runs with invoker privileges, minimal surface)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_saved_commutes_updated_at ON public.saved_commutes;
CREATE TRIGGER trg_saved_commutes_updated_at
  BEFORE UPDATE ON public.saved_commutes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3.2 Dual-layer profile ownership validation trigger for saved_plans
CREATE OR REPLACE FUNCTION public.verify_plan_profile_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.profile_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Cross-user profile reference forbidden: profile % does not belong to user %', NEW.profile_id, NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_plan_profile_ownership ON public.saved_plans;
CREATE TRIGGER trg_verify_plan_profile_ownership
  BEFORE INSERT OR UPDATE ON public.saved_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_plan_profile_ownership();

-- 3.3 Privacy Account Data Wipe Stored Procedure with hardened search_path
CREATE OR REPLACE FUNCTION public.wipe_user_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actions_deleted INT := 0;
  v_plans_deleted INT := 0;
  v_locations_deleted INT := 0;
  v_commutes_deleted INT := 0;
  v_profiles_deleted INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required for user data deletion.';
  END IF;

  DELETE FROM public.action_logs WHERE user_id = v_uid;
  GET DIAGNOSTICS v_actions_deleted = ROW_COUNT;

  DELETE FROM public.saved_plans WHERE user_id = v_uid;
  GET DIAGNOSTICS v_plans_deleted = ROW_COUNT;

  DELETE FROM public.saved_commutes WHERE user_id = v_uid;
  GET DIAGNOSTICS v_commutes_deleted = ROW_COUNT;

  DELETE FROM public.saved_locations WHERE user_id = v_uid;
  GET DIAGNOSTICS v_locations_deleted = ROW_COUNT;

  DELETE FROM public.profiles WHERE user_id = v_uid;
  GET DIAGNOSTICS v_profiles_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', 'success',
    'actions_deleted', v_actions_deleted,
    'plans_deleted', v_plans_deleted,
    'commutes_deleted', v_commutes_deleted,
    'locations_deleted', v_locations_deleted,
    'profiles_deleted', v_profiles_deleted
  );
END;
$$;

-- Restrict function execution permissions
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.verify_plan_profile_ownership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_plan_profile_ownership() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.wipe_user_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipe_user_data() TO authenticated;

-- ==============================================================================
-- 4. Row-Level Security (RLS) Configuration
-- Strictly isolates user records and blocks anonymous (anon) role access
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_commutes ENABLE ROW LEVEL SECURITY;

-- ----------------- Profiles Policies -----------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------- Saved Locations Policies -----------------
DROP POLICY IF EXISTS "saved_locations_select_own" ON public.saved_locations;
CREATE POLICY "saved_locations_select_own"
  ON public.saved_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_locations_insert_own" ON public.saved_locations;
CREATE POLICY "saved_locations_insert_own"
  ON public.saved_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_locations_update_own" ON public.saved_locations;
CREATE POLICY "saved_locations_update_own"
  ON public.saved_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_locations_delete_own" ON public.saved_locations;
CREATE POLICY "saved_locations_delete_own"
  ON public.saved_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------- Saved Plans Policies -----------------
DROP POLICY IF EXISTS "saved_plans_select_own" ON public.saved_plans;
CREATE POLICY "saved_plans_select_own"
  ON public.saved_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_plans_insert_own" ON public.saved_plans;
CREATE POLICY "saved_plans_insert_own"
  ON public.saved_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_plans_update_own" ON public.saved_plans;
CREATE POLICY "saved_plans_update_own"
  ON public.saved_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_plans_delete_own" ON public.saved_plans;
CREATE POLICY "saved_plans_delete_own"
  ON public.saved_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------- Action Logs Policies -----------------
DROP POLICY IF EXISTS "action_logs_select_own" ON public.action_logs;
CREATE POLICY "action_logs_select_own"
  ON public.action_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_logs_insert_own" ON public.action_logs;
CREATE POLICY "action_logs_insert_own"
  ON public.action_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_logs_update_own" ON public.action_logs;
CREATE POLICY "action_logs_update_own"
  ON public.action_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_logs_delete_own" ON public.action_logs;
CREATE POLICY "action_logs_delete_own"
  ON public.action_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------- Saved Commutes Policies -----------------
DROP POLICY IF EXISTS "saved_commutes_select_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_select_own"
  ON public.saved_commutes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_commutes_insert_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_insert_own"
  ON public.saved_commutes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_commutes_update_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_update_own"
  ON public.saved_commutes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_commutes_delete_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_delete_own"
  ON public.saved_commutes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. Force PostgREST Schema Cache Reload
-- ==============================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
