-- ==============================================================================
-- VayuVerse Database Schema Verification Script (Read-Only)
-- Run this in Supabase SQL Editor after executing the migration.
-- ==============================================================================

-- 1. Verify that all 5 tables exist in the public schema
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'saved_locations', 'saved_plans', 'action_logs', 'saved_commutes')
ORDER BY table_name;

-- 2. Verify Row-Level Security (RLS) is enabled on all 5 tables
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('profiles', 'saved_locations', 'saved_plans', 'action_logs', 'saved_commutes')
  AND relnamespace = 'public'::regnamespace
ORDER BY relname;

-- 3. Verify columns and data types for the required tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'saved_locations', 'saved_plans', 'action_logs', 'saved_commutes')
ORDER BY table_name, ordinal_position;

-- 4. Verify RLS policies and targeting (ensure role is authenticated)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'saved_locations', 'saved_plans', 'action_logs', 'saved_commutes')
ORDER BY tablename, cmd;

-- 5. Verify Foreign Key constraints (including composite profile-user reference)
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN ('public.profiles', 'public.saved_locations', 'public.saved_plans', 'public.action_logs', 'public.saved_commutes')
ORDER BY table_name, constraint_name;
