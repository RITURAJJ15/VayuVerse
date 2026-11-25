-- ==============================================================================
-- VayuVerse Persistence & Impact Tracker Schema Migration
-- Designed for PostgreSQL / Supabase with strict Row-Level Security (RLS)
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  persona TEXT CHECK (persona IN (
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
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Saved Locations Table (Privacy-Preserving Rounded Coordinates)
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  rounded_latitude NUMERIC(6,3) NOT NULL,
  rounded_longitude NUMERIC(6,3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Saved Plans Table (Snapshot of Environmental Context & AI Guidance)
CREATE TABLE IF NOT EXISTS public.saved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  environmental_snapshot JSONB NOT NULL,
  generated_plan JSONB NOT NULL,
  prompt_version TEXT DEFAULT 'v1.0' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Action Logs Table (Verified Sustainability Ledger)
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

-- ==============================================================================
-- Indexes for Performance & Scalability
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON public.saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_plans_user_id ON public.saved_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id_status ON public.action_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at);

-- ==============================================================================
-- Automated Updated-At Timestamp Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Row-Level Security (RLS) Configuration
-- Every table is restricted so users can strictly only access their own rows.
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- ----------------- Profiles Policies -----------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------- Saved Locations Policies -----------------
DROP POLICY IF EXISTS "saved_locations_select_own" ON public.saved_locations;
CREATE POLICY "saved_locations_select_own"
  ON public.saved_locations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_locations_insert_own" ON public.saved_locations;
CREATE POLICY "saved_locations_insert_own"
  ON public.saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_locations_update_own" ON public.saved_locations;
CREATE POLICY "saved_locations_update_own"
  ON public.saved_locations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_locations_delete_own" ON public.saved_locations;
CREATE POLICY "saved_locations_delete_own"
  ON public.saved_locations FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------- Saved Plans Policies -----------------
DROP POLICY IF EXISTS "saved_plans_select_own" ON public.saved_plans;
CREATE POLICY "saved_plans_select_own"
  ON public.saved_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_plans_insert_own" ON public.saved_plans;
CREATE POLICY "saved_plans_insert_own"
  ON public.saved_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_plans_update_own" ON public.saved_plans;
CREATE POLICY "saved_plans_update_own"
  ON public.saved_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_plans_delete_own" ON public.saved_plans;
CREATE POLICY "saved_plans_delete_own"
  ON public.saved_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------- Action Logs Policies -----------------
DROP POLICY IF EXISTS "action_logs_select_own" ON public.action_logs;
CREATE POLICY "action_logs_select_own"
  ON public.action_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_logs_insert_own" ON public.action_logs;
CREATE POLICY "action_logs_insert_own"
  ON public.action_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_logs_update_own" ON public.action_logs;
CREATE POLICY "action_logs_update_own"
  ON public.action_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "action_logs_delete_own" ON public.action_logs;
CREATE POLICY "action_logs_delete_own"
  ON public.action_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Privacy Stored Procedure: Complete Data Wipe for Authenticated User
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.wipe_user_data()
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actions_deleted INT;
  v_plans_deleted INT;
  v_locations_deleted INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required for user data deletion.';
  END IF;

  DELETE FROM public.action_logs WHERE user_id = v_uid;
  GET DIAGNOSTICS v_actions_deleted = ROW_COUNT;

  DELETE FROM public.saved_plans WHERE user_id = v_uid;
  GET DIAGNOSTICS v_plans_deleted = ROW_COUNT;

  DELETE FROM public.saved_locations WHERE user_id = v_uid;
  GET DIAGNOSTICS v_locations_deleted = ROW_COUNT;

  DELETE FROM public.profiles WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'status', 'success',
    'actions_deleted', v_actions_deleted,
    'plans_deleted', v_plans_deleted,
    'locations_deleted', v_locations_deleted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
