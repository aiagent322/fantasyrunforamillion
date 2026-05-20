/**
 * Fantasy Run For A Million — Supabase Key Config (Example)
 * ==========================================================
 * This file shows how to set the Supabase anon key at runtime.
 * The key itself MUST NOT be committed to GitHub.
 *
 * ── OPTION A: Cloudflare Pages (recommended for production) ────────────────
 *
 *   1. Cloudflare Pages Dashboard → Settings → Environment Variables → Add:
 *        Name:  FRFAM_SUPABASE_ANON_KEY
 *        Value: eyJhbGci...your-actual-anon-key...
 *        (Add for both Production and Preview environments)
 *
 *   2. Set this build command in Cloudflare Pages:
 *        echo "window.FRFAM_SUPABASE_ANON_KEY='$FRFAM_SUPABASE_ANON_KEY';" > engine/supabase-keys.js
 *
 *   3. Set build output directory to:  /  (root)
 *
 *   This generates engine/supabase-keys.js at deploy time from the env var.
 *   The file is gitignored — it never appears in GitHub.
 *
 * ── OPTION B: Local development ────────────────────────────────────────────
 *
 *   1. Copy this file:
 *        cp engine/supabase-keys.example.js engine/supabase-keys.js
 *
 *   2. Add your anon key (engine/supabase-keys.js is in .gitignore):
 *        window.FRFAM_SUPABASE_ANON_KEY = 'eyJhbGci...your-actual-anon-key...';
 *
 *   3. Serve locally and test — the key loads before email-capture.js and
 *      team-submit.js, which both read window.FRFAM_SUPABASE_ANON_KEY.
 *
 * ── FINDING YOUR ANON KEY ──────────────────────────────────────────────────
 *
 *   Supabase Dashboard → Settings → API → Project API Keys → anon / public
 *   URL: https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/settings/api
 *
 * ── WHY THE ANON KEY IS SAFE IN CLIENT-SIDE JS ────────────────────────────
 *
 *   The Supabase anon key identifies your project but does NOT grant access
 *   beyond what Row Level Security (RLS) permits. For this project:
 *
 *   email_subscribers:    anon INSERT only (no read, update, delete)
 *   fantasy_teams:        anon INSERT only (no read, update, delete)
 *   fantasy_team_riders:  anon INSERT only (no read, update, delete)
 *   leaderboard_snapshots: anon SELECT only where is_current = true
 *   event_results:         NO anon access at all
 *
 *   The service role key grants full access — NEVER expose it in client code.
 *
 * ── SCRIPT LOAD ORDER (all pages with forms) ──────────────────────────────
 *
 *   <script src="/engine/supabase-keys.js" onerror="void(0)"></script>
 *   <script src="/engine/team-submit.js" defer></script>        (pick-your-team only)
 *   <script src="/engine/email-capture.js" defer></script>
 *   <script src="/engine/analytics.js" defer></script>
 *
 *   supabase-keys.js is NOT deferred — it sets window.FRFAM_SUPABASE_ANON_KEY
 *   synchronously before the deferred scripts run. The onerror="void(0)"
 *   prevents console errors if the file is absent (graceful demo mode).
 */

window.FRFAM_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
