-- =============================================================================
-- Fantasy Run For A Million — Email Subscribers
-- Migration: 001_email_subscribers
-- Supabase Project: ptuuuishzwwgmaexneul
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard
--      https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/sql
--   2. Paste this entire file into the SQL Editor
--   3. Click Run
--
-- WHAT THIS CREATES:
--   - Table: public.email_subscribers
--   - RLS: enabled (anon insert only — no select, update, or delete)
--   - Indexes: created_at DESC, email (for dedup)
-- =============================================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  source     text,        -- page type: 'homepage', 'leaderboard', 'article', etc.
  variant    text,        -- form variant: 'waitlist', 'news', 'leaderboard', 'contest'
  page_url   text,        -- window.location.pathname at time of signup
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_subscribers_email_unique UNIQUE (email)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Time-ordered queries (subscriber growth charts, exports)
CREATE INDEX IF NOT EXISTS idx_email_subscribers_created_at
  ON public.email_subscribers (created_at DESC);

-- Fast email lookup (used internally for dedup — not exposed to anon)
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email
  ON public.email_subscribers (lower(email));

-- Source/variant analytics (which page and form drive the most signups)
CREATE INDEX IF NOT EXISTS idx_email_subscribers_source_variant
  ON public.email_subscribers (source, variant);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- ANON INSERT ONLY
-- The anon role (used by the public website with the anon key) can insert rows.
-- No select, update, or delete for anon. Service role retains full access.
CREATE POLICY "anon_insert_only"
  ON public.email_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── Verification queries ──────────────────────────────────────────────────────
-- Run these after migration to confirm everything is set up correctly:

-- Should return: tablename='email_subscribers', rowsecurity=true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'email_subscribers';

-- Should return one row: anon_insert_only
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'email_subscribers';

-- Should return all four indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'email_subscribers';
