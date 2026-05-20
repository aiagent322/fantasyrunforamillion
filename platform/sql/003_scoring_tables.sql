-- =============================================================================
-- Fantasy Run For A Million — Scoring Architecture
-- Migration: 003_scoring_tables
-- Supabase Project: ptuuuishzwwgmaexneul
--
-- HOW TO RUN:
--   1. Supabase Dashboard → SQL Editor
--      https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/sql
--   2. Paste and Run
--
-- WHAT THIS CREATES:
--   - Table: public.event_results        (official results per rider per event)
--   - Table: public.leaderboard_snapshots (computed team standings)
--   - RLS:   zero anon write access on event_results
--   - RLS:   anon SELECT on leaderboard_snapshots (public leaderboard reads)
-- =============================================================================

-- ── event_results ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_results (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug     text        NOT NULL,         -- e.g. 'run-for-a-million-2025'
  discipline     text        NOT NULL,         -- 'reining' | 'cow-horse' | 'cutting'
  rider_slug     text        NOT NULL,         -- matches riders.json slug
  placing        integer,                       -- final placing (1, 2, 3, ...)
  score          numeric,                       -- raw competition score (e.g. 221.5)
  fantasy_points integer     NOT NULL DEFAULT 0, -- computed from placing + bonuses
  bonus_flags    text[],                        -- array of applied bonus keys
  notes          text,                          -- admin notes (DQ, scratch, etc.)
  entered_by     text,                          -- admin identifier (future auth)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate result entries per rider per event per discipline
  CONSTRAINT unique_rider_event_discipline
    UNIQUE (event_slug, discipline, rider_slug)
);

CREATE INDEX IF NOT EXISTS idx_event_results_event_slug
  ON public.event_results (event_slug);

CREATE INDEX IF NOT EXISTS idx_event_results_discipline
  ON public.event_results (event_slug, discipline);

CREATE INDEX IF NOT EXISTS idx_event_results_rider_slug
  ON public.event_results (rider_slug);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_results_updated_at
  BEFORE UPDATE ON public.event_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── leaderboard_snapshots ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug      text        NOT NULL DEFAULT 'run-for-a-million-2025',
  fantasy_team_id uuid        NOT NULL REFERENCES public.fantasy_teams(id) ON DELETE CASCADE,
  total_points    integer     NOT NULL DEFAULT 0,
  rank            integer,
  bonus_points    integer     NOT NULL DEFAULT 0,
  rider_count     integer     NOT NULL DEFAULT 0, -- how many riders have results
  is_current      boolean     NOT NULL DEFAULT true,
  snapshot_date   timestamptz NOT NULL DEFAULT now(),

  -- Only one current snapshot per team per event
  CONSTRAINT unique_current_snapshot
    UNIQUE (event_slug, fantasy_team_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank
  ON public.leaderboard_snapshots (event_slug, rank ASC) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_leaderboard_points
  ON public.leaderboard_snapshots (event_slug, total_points DESC) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_leaderboard_team_id
  ON public.leaderboard_snapshots (fantasy_team_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────

-- event_results: NO anon access (admin/service-role only)
-- Future: add authenticated policy for admin role
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

-- leaderboard_snapshots: anon SELECT (public leaderboard reads current rankings)
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_leaderboard"
  ON public.leaderboard_snapshots
  FOR SELECT
  TO anon
  USING (is_current = true);

-- ── Admin result ingestion workflow ────────────────────────────────────────────
--
-- All writes to event_results must go through a Cloudflare Worker proxy.
-- The Worker uses SUPABASE_SERVICE_ROLE_KEY (env var, never in client code).
-- The Worker validates the admin session before forwarding to Supabase.
--
-- Future auth policy (add when Supabase Auth is integrated):
--
--   CREATE POLICY "admin_all_event_results"
--     ON public.event_results
--     FOR ALL
--     TO authenticated
--     USING (auth.jwt() ->> 'role' = 'admin')
--     WITH CHECK (auth.jwt() ->> 'role' = 'admin');
--
-- ── Verification ───────────────────────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('event_results', 'leaderboard_snapshots');

SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('event_results', 'leaderboard_snapshots');
