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
