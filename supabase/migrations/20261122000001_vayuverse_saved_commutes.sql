-- ==============================================================================
-- VayuVerse Saved Daily Commutes Migration
-- Allows authenticated users to save frequently used routes with strict RLS
-- ==============================================================================

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

-- Index for user query performance
CREATE INDEX IF NOT EXISTS idx_saved_commutes_user_id ON public.saved_commutes(user_id);

-- Update trigger
DROP TRIGGER IF EXISTS trg_saved_commutes_updated_at ON public.saved_commutes;
CREATE TRIGGER trg_saved_commutes_updated_at
  BEFORE UPDATE ON public.saved_commutes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.saved_commutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_commutes_select_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_select_own"
  ON public.saved_commutes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_commutes_insert_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_insert_own"
  ON public.saved_commutes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_commutes_update_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_update_own"
  ON public.saved_commutes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_commutes_delete_own" ON public.saved_commutes;
CREATE POLICY "saved_commutes_delete_own"
  ON public.saved_commutes FOR DELETE
  USING (auth.uid() = user_id);
