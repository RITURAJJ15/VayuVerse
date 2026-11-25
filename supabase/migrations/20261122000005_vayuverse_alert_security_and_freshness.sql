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
