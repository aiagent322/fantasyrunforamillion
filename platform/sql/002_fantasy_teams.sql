-- =============================================================================
-- Fantasy Run For A Million — Fantasy Team Submission
-- Migration: 002_fantasy_teams
-- Supabase Project: ptuuuishzwwgmaexneul
--
-- HOW TO RUN:
--   1. Open Supabase SQL Editor
--      https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/sql
--   2. Paste this entire file and click Run
--
-- WHAT THIS CREATES:
--   - Table: public.fantasy_teams       (team name + email)
--   - Table: public.fantasy_team_riders (rider selections per team)
--   - RLS:   anon insert-only on both tables
--   - FK:    fantasy_team_riders → fantasy_teams (cascade delete)
-- =============================================================================

-- ── fantasy_teams ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fantasy_teams (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name  text        NOT NULL,
  email      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- One entry per email address (can be relaxed per contest period later)
  CONSTRAINT fantasy_teams_email_unique UNIQUE (email)
);

-- Ordered by signup time for future leaderboard association
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_created_at
  ON public.fantasy_teams (created_at DESC);

-- Fast lookup by email
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_email
  ON public.fantasy_teams (lower(email));

-- ── fantasy_team_riders ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fantasy_team_riders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id uuid        NOT NULL
    REFERENCES public.fantasy_teams(id) ON DELETE CASCADE,
  rider_slug      text        NOT NULL,  -- e.g. 'andrea-fappani'
  discipline      text        NOT NULL,  -- 'reining' | 'cow-horse' | 'cutting'
  slot_type       text        NOT NULL,  -- 'discipline' | 'bonus'
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Prevent the same rider appearing twice on the same team
  CONSTRAINT unique_rider_per_team UNIQUE (fantasy_team_id, rider_slug)
);

-- Fast lookup by team
CREATE INDEX IF NOT EXISTS idx_fantasy_team_riders_team_id
  ON public.fantasy_team_riders (fantasy_team_id);

-- Rider popularity queries (which riders get selected most)
CREATE INDEX IF NOT EXISTS idx_fantasy_team_riders_slug
  ON public.fantasy_team_riders (rider_slug);

-- Discipline distribution queries
CREATE INDEX IF NOT EXISTS idx_fantasy_team_riders_discipline
  ON public.fantasy_team_riders (discipline);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.fantasy_teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_team_riders ENABLE ROW LEVEL SECURITY;

-- Anon can INSERT fantasy teams (public contest entry)
-- No SELECT, UPDATE, or DELETE for anon
CREATE POLICY "anon_insert_fantasy_teams"
  ON public.fantasy_teams
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon can INSERT riders linked to a team they just created
-- No SELECT, UPDATE, or DELETE for anon
CREATE POLICY "anon_insert_fantasy_team_riders"
  ON public.fantasy_team_riders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── Verification ──────────────────────────────────────────────────────────────

-- Should return both tables with rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('fantasy_teams', 'fantasy_team_riders');

-- Should return two insert policies
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('fantasy_teams', 'fantasy_team_riders');

-- ── Future readiness notes ────────────────────────────────────────────────────
-- To support user accounts and saved teams later:
--
-- 1. Add: auth_user_id uuid REFERENCES auth.users(id) to fantasy_teams
-- 2. Add: contest_period text to fantasy_teams (e.g. '2025-main')
-- 3. Drop: fantasy_teams_email_unique constraint (or scope it to contest_period)
-- 4. Add RLS policies for authenticated SELECT (users read own teams)
-- 5. Add scoring fields to fantasy_team_riders once live scoring is active:
--    score numeric, placement integer, points_earned numeric
