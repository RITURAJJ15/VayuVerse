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
-- ==============================================================================
-- VayuVerse Phase 7 Database Schema Migration
-- Real-Time Air Quality Alerts, Notification Preferences & Push Subscriptions
-- Transactional, idempotent, hardened RLS, PostgREST schema reload
-- ==============================================================================

BEGIN;

-- 1. Air Alerts Table
CREATE TABLE IF NOT EXISTS public.air_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'observed_threshold',
    'category_deterioration',
    'elevated_hazard',
    'forecast_advisory',
    'scheduled_activity_risk',
    'improvement_resolved'
  )),
  severity TEXT NOT NULL CHECK (severity IN (
    'Good',
    'Satisfactory',
    'Moderate',
    'Poor',
    'Very Poor',
    'Severe'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'read',
    'dismissed',
    'resolved'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'observed',
    'forecast',
    'data_unavailable'
  )),
  pollutant TEXT,
  observed_value NUMERIC(8,2),
  aqi_value INTEGER,
  source_timestamp TIMESTAMPTZ NOT NULL,
  source_name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT uq_air_alerts_user_fingerprint UNIQUE (user_id, fingerprint)
);

-- 2. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  browser_notifications_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  minimum_severity TEXT NOT NULL DEFAULT 'Moderate' CHECK (minimum_severity IN (
    'Good',
    'Satisfactory',
    'Moderate',
    'Poor',
    'Very Poor',
    'Severe'
  )),
  quiet_hours_start TEXT DEFAULT '22:00' NOT NULL,
  quiet_hours_end TEXT DEFAULT '07:00' NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Indexes for Rapid Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_air_alerts_user_id ON public.air_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_air_alerts_user_status ON public.air_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_air_alerts_created_at ON public.air_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_air_alerts_fingerprint ON public.air_alerts(fingerprint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- 5. Updated_at Trigger on notification_preferences
DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row Level Security
ALTER TABLE public.air_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: air_alerts
DROP POLICY IF EXISTS "Users can view own air alerts" ON public.air_alerts;
CREATE POLICY "Users can view own air alerts"
  ON public.air_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own air alerts" ON public.air_alerts;
CREATE POLICY "Users can insert own air alerts"
  ON public.air_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own air alerts" ON public.air_alerts;
CREATE POLICY "Users can update own air alerts"
  ON public.air_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own air alerts" ON public.air_alerts;
CREATE POLICY "Users can delete own air alerts"
  ON public.air_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. RLS Policies: notification_preferences
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can delete own notification preferences"
  ON public.notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 9. RLS Policies: push_subscriptions
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
-- =============================================================================
-- VayuVerse Migration 20261122000005: Strict Role Allowlist, Dynamic Policy Cleanup,
-- Ingestion Integrity & Immutability Safeguards
-- =============================================================================
-- 1. Dynamically purges all existing RLS policies on public.air_alerts regardless of name.
-- 2. Restricts table privileges: authenticated users can only SELECT and UPDATE (status).
-- 3. Grants full administrative access to service_role for trusted server-side ingestion.
-- 4. Recreates hardened RLS policies:
--    - SELECT: authenticated users can read only their own alerts (auth.uid() = user_id).
--    - UPDATE: authenticated users can ONLY update their own alert status to ('read', 'dismissed').
--    - INSERT / DELETE: NO policy for authenticated or anon (strictly denied by RLS default).
-- 5. Helper Function: is_trusted_alert_writer()
--    - STRICT ALLOWLIST: Recognizes ONLY 'service_role' (with matching JWT role) and 'postgres' / 'supabase_admin'.
--    - Rejects any unrecognized role, arbitrary header, or client role.
-- 6. Trigger validate_air_alert_insert (SECURITY INVOKER):
--    - Uses public.is_trusted_alert_writer() to block any client REST insert.
--    - Validates source freshness (<= 3h for urgent alerts) and non-future timestamps.
-- 7. Trigger protect_air_alert_immutability (SECURITY INVOKER):
--    - Uses public.is_trusted_alert_writer() to allow trusted backend lifecycle operations (resolving).
--    - For all other roles: verifies ownership, blocks modifying telemetry/timestamps/resolved_at,
--      and limits status updates strictly to 'read' or 'dismissed'.
-- 8. Completely idempotent and non-destructive to existing tables and data.
-- =============================================================================

BEGIN;

-- 1. Ensure Row Level Security is enabled on public.air_alerts
ALTER TABLE public.air_alerts ENABLE ROW LEVEL SECURITY;

-- 2. Dynamic policy purge: Drop EVERY existing policy on public.air_alerts to prevent permissive leaks
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'air_alerts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.air_alerts;', pol.policyname);
  END LOOP;
END $$;

-- 3. Revoke all direct privileges from public, anon, and authenticated
REVOKE ALL ON public.air_alerts FROM anon, public;
REVOKE ALL ON public.air_alerts FROM authenticated;

-- 4. Grant strict, minimal column privileges
-- Authenticated users can read their own rows
GRANT SELECT ON public.air_alerts TO authenticated;

-- Authenticated users can UPDATE ONLY the status column (to mark read or dismissed)
GRANT UPDATE (status) ON public.air_alerts TO authenticated;

-- Trusted server-side backend (service_role) retains full operational privileges
GRANT ALL ON public.air_alerts TO service_role;

-- 5. Recreate strict Row Level Security Policies
-- Policy: Authenticated users can view only their own alerts
CREATE POLICY "Users can view own air alerts"
  ON public.air_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can update ONLY status of their own alerts to 'read' or 'dismissed'
CREATE POLICY "Users can update own alert read status"
  ON public.air_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    status IN ('read', 'dismissed')
  );

-- NOTE: There is intentionally NO policy for INSERT or DELETE for authenticated or anon.
-- Under PostgreSQL RLS, lack of an INSERT/DELETE policy causes all client writes to be rejected by default.

-- 6. Helper Function: Strict Positive Role Allowlist
-- Replaces any negative list logic (e.g. "not authenticated/anon").
-- Explicitly validates that the execution context is an intended trusted server role.
CREATE OR REPLACE FUNCTION public.is_trusted_alert_writer()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Direct administrative database connections (pg_cron, migrations, superuser)
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN TRUE;
  END IF;

  -- Supabase PostgREST service_role execution:
  -- Must have PostgreSQL role 'service_role' AND verified JWT claim role 'service_role'
  IF current_user = 'service_role' AND COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- All other roles (authenticated, anon, or any unverified role) are untrusted
  RETURN FALSE;
END;
$$;

-- 7. Trigger Function: Validate alert insertion and block client REST inserts
CREATE OR REPLACE FUNCTION public.validate_air_alert_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Strict Allowlist: Only verified service_role or administrative database roles can insert alerts
  IF NOT public.is_trusted_alert_writer() THEN
    RAISE EXCEPTION 'Access denied: Only trusted server-side execution roles (service_role) can record authoritative air alerts.';
  END IF;

  -- Validate required fields and telemetry integrity for trusted server-side inserts
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Alert must be bound to a valid user_id.';
  END IF;

  -- Source-Aware Freshness Gate:
  -- Observed emergency hazard alerts (Severe, Very Poor, Poor) must be recent (<= 3 hours old)
  IF NEW.source_type = 'observed' AND NEW.severity IN ('Poor', 'Very Poor', 'Severe') THEN
    IF NEW.source_timestamp < (NOW() - INTERVAL '3 hours') THEN
      RAISE EXCEPTION 'Cannot record an urgent emergency hazard alert with source telemetry older than 3 hours.';
    END IF;
  END IF;

  -- Telemetry cannot be timestamped in the future
  IF NEW.source_timestamp > (NOW() + INTERVAL '10 minutes') AND NEW.source_type = 'observed' THEN
    RAISE EXCEPTION 'Observed physical telemetry cannot have a future timestamp.';
  END IF;

  -- Initial status must be 'active'
  IF NEW.status NOT IN ('active', 'read') THEN
    NEW.status := 'active';
  END IF;

  -- Require non-empty title, message, and fingerprint
  IF LENGTH(TRIM(NEW.title)) < 3 OR LENGTH(TRIM(NEW.message)) < 5 OR LENGTH(TRIM(NEW.fingerprint)) < 5 THEN
    RAISE EXCEPTION 'Alert must contain valid title, message, and fingerprint.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_air_alert_insert ON public.air_alerts;
CREATE TRIGGER trg_validate_air_alert_insert
  BEFORE INSERT ON public.air_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_air_alert_insert();

-- 8. Trigger Function: Prevent modification of authoritative telemetry on UPDATE
CREATE OR REPLACE FUNCTION public.protect_air_alert_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- If executed by an authorized server role, allow automated lifecycle updates (e.g. resolving alerts)
  IF public.is_trusted_alert_writer() THEN
    RETURN NEW;
  END IF;

  -- For all other roles (including authenticated users):
  -- 1. Ensure user is the owner
  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only update your own alerts.';
  END IF;

  -- 2. Disallow modifying any authoritative environmental telemetry, metadata, or timestamps
  IF (
    OLD.user_id IS DISTINCT FROM NEW.user_id OR
    OLD.alert_type IS DISTINCT FROM NEW.alert_type OR
    OLD.severity IS DISTINCT FROM NEW.severity OR
    OLD.source_type IS DISTINCT FROM NEW.source_type OR
    OLD.pollutant IS DISTINCT FROM NEW.pollutant OR
    OLD.observed_value IS DISTINCT FROM NEW.observed_value OR
    OLD.aqi_value IS DISTINCT FROM NEW.aqi_value OR
    OLD.source_timestamp IS DISTINCT FROM NEW.source_timestamp OR
    OLD.source_name IS DISTINCT FROM NEW.source_name OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.message IS DISTINCT FROM NEW.message OR
    OLD.recommended_action IS DISTINCT FROM NEW.recommended_action OR
    OLD.fingerprint IS DISTINCT FROM NEW.fingerprint OR
    OLD.created_at IS DISTINCT FROM NEW.created_at OR
    OLD.resolved_at IS DISTINCT FROM NEW.resolved_at
  ) THEN
    RAISE EXCEPTION 'Authoritative environmental telemetry and alert metadata cannot be modified by clients.';
  END IF;

  -- 3. Users can ONLY mark alerts as 'read' or 'dismissed'. Environmental resolution is server-controlled.
  IF NEW.status NOT IN ('read', 'dismissed') THEN
    RAISE EXCEPTION 'Clients may only mark alerts as read or dismissed; environmental resolution is server-controlled.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_air_alert_immutability ON public.air_alerts;
CREATE TRIGGER trg_protect_air_alert_immutability
  BEFORE UPDATE ON public.air_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_air_alert_immutability();

COMMIT;

NOTIFY pgrst, 'reload schema';
