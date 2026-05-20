# Fantasy Run For A Million — Launch Checklist

> **Purpose:** Pre-launch verification for safe public opening of fantasy team submission  
> **Status:** Complete this checklist in order before announcing public entry  
> **Project:** ptuuuishzwwgmaexneul (Supabase) / aiagent322/fantasyrunforamillion (GitHub)

---

## SECTION 1 — Supabase Database Setup

### 1A. Run SQL Migrations (in order)

Open the Supabase SQL Editor:
`https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/sql`

- [ ] Run `platform/sql/001_email_subscribers.sql` — email capture table + RLS
- [ ] Run `platform/sql/002_fantasy_teams.sql` — team submission tables + RLS
- [ ] Run `platform/sql/003_scoring_tables.sql` — event results + leaderboard snapshots (admin scoring — can wait until scoring is needed)

### 1B. Verify Tables Exist

In Supabase Table Editor, confirm all tables are present:
- [ ] `email_subscribers` — with `id`, `email`, `source`, `variant`, `page_url`, `created_at`
- [ ] `fantasy_teams` — with `id`, `team_name`, `email` (UNIQUE), `created_at`
- [ ] `fantasy_team_riders` — with `id`, `fantasy_team_id` (FK), `rider_slug`, `discipline`, `slot_type`, `created_at`

### 1C. Verify RLS and Policies

Run in SQL Editor:

```sql
-- Confirm RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('email_subscribers','fantasy_teams','fantasy_team_riders');

-- Confirm policies (should show insert-only for anon, nothing else)
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('email_subscribers','fantasy_teams','fantasy_team_riders');
```

Expected results:
- [ ] All three tables show `rowsecurity = true`
- [ ] `anon_insert_only` on `email_subscribers` (FOR INSERT only)
- [ ] `anon_insert_fantasy_teams` on `fantasy_teams` (FOR INSERT only)
- [ ] `anon_insert_fantasy_team_riders` on `fantasy_team_riders` (FOR INSERT only)
- [ ] **No SELECT, UPDATE, or DELETE policies for anon on any of these tables**

---

## SECTION 2 — Supabase Key Configuration

### 2A. Cloudflare Pages Build Command (production)

In Cloudflare Pages Dashboard → Your Project → Settings → Environment Variables:

- [ ] Add variable: `FRFAM_SUPABASE_ANON_KEY`
  - Value: `eyJhbGci...` (your actual anon key from Supabase Settings → API)
  - Scope: Production ✓ + Preview ✓

In Cloudflare Pages Dashboard → Build & Deploy → Build Configuration:

- [ ] Set **Build command**:
  ```
  echo "window.FRFAM_SUPABASE_ANON_KEY='$FRFAM_SUPABASE_ANON_KEY';" > engine/supabase-keys.js
  ```
- [ ] Set **Build output directory**: `/` (root — no framework, pure static)
- [ ] Trigger a new deployment to apply

This generates `engine/supabase-keys.js` at deploy time from the env var. The file is in `.gitignore` and never committed.

### 2B. Key Safety Verification

- [ ] Confirm `engine/supabase-keys.js` is in `.gitignore` — check `.gitignore` in repo root
- [ ] Confirm `.env.local` is in `.gitignore`
- [ ] Confirm no JWT token (`eyJhbGci...`) appears in any committed file
- [ ] Confirm the Supabase **service role key** is not referenced anywhere in the frontend code
- [ ] Confirm `PROVIDER.active = 'supabase'` in `engine/email-capture.js`
- [ ] Confirm both `engine/email-capture.js` and `engine/team-submit.js` read the key from `window.FRFAM_SUPABASE_ANON_KEY` only — never hardcoded

**Security rule:** The anon key is safe in client-side JS — protected by RLS. The service role key must never appear outside Cloudflare Worker environment variables or the Supabase dashboard.

---

## SECTION 3 — Manual Submission Test Sequence

Run this sequence on the **production domain** (not localhost) after deploying.

### 3A. First Submission Test

- [ ] Navigate to `https://fantasyrunforamillion.com/pick-your-team`
- [ ] Select 2 reining riders, 2 cow horse riders, 2 cutting riders, 1 bonus rider
- [ ] Enter a test team name (e.g. `Test Team Alpha`)
- [ ] Enter a test email (e.g. `test@yourdomain.com`)
- [ ] Click **Submit Your Team**
- [ ] Confirm the **success state** appears (form hides, "Team Submitted!" message shows)
- [ ] Open browser DevTools → Console — confirm no errors, confirm `[FRFAM Team]` log shows

### 3B. Verify Database Rows

In Supabase Table Editor:

- [ ] Open `fantasy_teams` — confirm one row with the test team name and email
- [ ] Open `fantasy_team_riders` — confirm 7 rows linked to the `fantasy_teams.id` from the previous step
- [ ] Confirm `rider_slug` values look correct (e.g. `andrea-fappani`, not `Andrea Fappani`)
- [ ] Confirm `discipline` values are `reining`, `cow-horse`, or `cutting`
- [ ] Confirm `slot_type` is `discipline` for 6 rows and `bonus` for 1 row

### 3C. Duplicate Email Test

- [ ] Without clearing the browser or changing riders, navigate back to `/pick-your-team`
- [ ] Select a complete roster again
- [ ] Enter the **same test email** from 3A
- [ ] Enter any team name
- [ ] Click **Submit Your Team**
- [ ] **Expected:** Error message appears: *"This email already has a team entered. Only one entry per email."*
- [ ] **Expected:** No second row appears in `fantasy_teams` for that email
- [ ] Confirm the form does NOT show the success state on a duplicate

### 3D. Invalid Input Test

- [ ] Submit with an incomplete roster — confirm **Submit button stays disabled**
- [ ] Submit with a team name of 1 character — confirm inline error appears
- [ ] Submit with an invalid email (e.g. `notanemail`) — confirm inline error appears
- [ ] Confirm none of the above reach Supabase

### 3E. Email Capture Test

- [ ] Navigate to `/` (homepage)
- [ ] Submit the waitlist email form with a test email
- [ ] Confirm success message appears
- [ ] In Supabase → `email_subscribers` table — confirm the row with `variant=waitlist`
- [ ] Navigate to `/leaderboard` and repeat with a different test email (`variant=leaderboard`)
- [ ] Resubmit the first email on any page — confirm silent success (no error shown to user)

---

## SECTION 4 — Analytics Verification

### 4A. Plausible Dashboard Verification

After running the test sequence above, verify in the Plausible dashboard for `fantasyrunforamillion.com`:

- [ ] `fantasy_team_builder_view` appears (loading the pick-your-team page)
- [ ] `team_submission_attempt` appears after clicking Submit (fired by analytics.js on `frfam:team_submit` event)
- [ ] `email_signup_submit` appears after submitting an email form
- [ ] Page views appear for homepage, leaderboard, article pages

If events are **not appearing** in Plausible:
1. Confirm `CONFIG.provider = 'plausible'` in `engine/analytics.js`
2. Confirm `CONFIG.debug = true` temporarily and check browser console for `[FRFAM Analytics]` logs
3. Confirm the Plausible script tag is in `<head>` on every page: `data-domain="fantasyrunforamillion.com"`
4. Allow up to 5 minutes for Plausible to process events

### 4B. Event Names Reference

| Event | Trigger | Source |
|-------|---------|--------|
| `homepage_view` | Homepage loads | auto — `data-page-type="homepage"` |
| `fantasy_team_builder_view` | Pick-your-team loads | auto — `data-page-type="fantasy_team_builder"` |
| `team_submission_attempt` | Submit button clicked, submission complete | `frfam:team_submit` → analytics.js |
| `email_signup_submit` | Email form submitted successfully | `frfam:signup` → analytics.js |
| `rider_profile_view` | Any rider profile loads | auto — `data-page-type="rider_profile"` |
| `article_view` | Any article page loads | auto — `data-page-type="article"` |
| `leaderboard_view` | Leaderboard page loads | auto — `data-page-type="leaderboard"` |

### 4C. Turn Off Debug Logging

Once all events are verified in Plausible:
- [ ] Edit `engine/analytics.js` — change `debug: true` → `debug: false`
- [ ] Commit and push to GitHub — Cloudflare auto-deploys

---

## SECTION 5 — Cloudflare Pages Domain Setup

### 5A. Custom Domain

- [ ] Cloudflare Pages → `fantasyrunforamillion` project → Custom Domains → Add domain
- [ ] Add: `fantasyrunforamillion.com`
- [ ] If domain DNS is already on Cloudflare: auto-configured (DNS CNAME added automatically)
- [ ] If domain is on another registrar: update nameservers to Cloudflare, or add CNAME manually
- [ ] Confirm SSL certificate is active (auto-provisioned by Cloudflare)
- [ ] Test: `https://fantasyrunforamillion.com` loads correctly

### 5B. Production Deployment Verification

- [ ] Navigate to Cloudflare Pages → Deployments — confirm latest deployment is `Production` with status `Success`
- [ ] Confirm the build command ran: check deployment logs for `echo "window.FRFAM_SUPABASE_ANON_KEY..."` line
- [ ] Open browser DevTools → Network on `fantasyrunforamillion.com` — confirm `/engine/supabase-keys.js` returns 200 with correct content
- [ ] Run the full manual test sequence (Section 3) on the production domain

### 5C. Google Search Console

- [ ] Go to `https://search.google.com/search-console`
- [ ] Add property: `https://fantasyrunforamillion.com`
- [ ] Verify ownership via Cloudflare DNS TXT record
- [ ] Submit sitemap: `https://fantasyrunforamillion.com/sitemap.xml`
- [ ] Confirm sitemap has no errors (82+ URLs)
- [ ] Confirm `/admin/` is blocked (check coverage report — should not appear)

---

## SECTION 6 — Pre-Launch Final Checks

- [ ] Confirm `robots.txt` has `Disallow: /admin/` and `Disallow: /platform/`
- [ ] Confirm admin pages (`/admin`, `/admin/results`, `/admin/leaderboard`) return content but have `noindex, nofollow` meta tag
- [ ] Confirm no link to `/admin/` exists on any public page
- [ ] Review `scoring-rules/index.html` — confirm all point values match `data/scoring-config.json`
- [ ] Review `pick-your-team/index.html` — confirm submit notice says "Free entry — no payment required" (no gambling language)
- [ ] Confirm the footer disclaimer on all pages: "Fan engagement platform — not affiliated with The Run For A Million"
- [ ] Confirm pick-your-team success message does NOT promise a specific prize or outcome
- [ ] Do a final browser test across: Chrome, Safari (iOS), Chrome (Android)

---

## SECTION 7 — Future Schema Changes (Do Not Implement Yet)

Document only — these changes are blocked until the relevant systems are built.

### Multi-Season Support

When a second contest period opens:

```sql
-- 1. Add contest_period column
ALTER TABLE public.fantasy_teams
  ADD COLUMN IF NOT EXISTS contest_period text NOT NULL DEFAULT '2025-main';

-- 2. Drop email-only unique constraint
ALTER TABLE public.fantasy_teams
  DROP CONSTRAINT IF EXISTS fantasy_teams_email_unique;

-- 3. Add scoped unique constraint (one team per email per contest)
ALTER TABLE public.fantasy_teams
  ADD CONSTRAINT fantasy_teams_email_contest_unique UNIQUE (email, contest_period);
```

### User Authentication

When Supabase Auth is added:

```sql
-- Add auth user FK (nullable — allows anonymous submissions to remain valid)
ALTER TABLE public.fantasy_teams
  ADD COLUMN IF NOT EXISTS auth_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add RLS policy for authenticated users to read own teams
CREATE POLICY "auth_user_select_own_teams"
  ON public.fantasy_teams
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());
```

---

## Section 8 — Emergency Reference

| Issue | Resolution |
|-------|-----------|
| Submissions showing "Submission not yet open" | Supabase anon key not set — check Cloudflare Pages env var and build command ran |
| "Only one entry per email" shown on first submit | Duplicate row already in `fantasy_teams` — check for previous test submissions |
| Team submitted but no rider rows | `fantasy_team_riders` insert failed — check browser console for `[FRFAM Team] Server error` |
| Email form silently failing | `email_subscribers` table not created — run `001_email_subscribers.sql` |
| Plausible events not appearing | Wait 5 min, confirm `data-domain` attribute on Plausible script tag matches exactly |
| Admin pages publicly indexed | `robots.txt` not deployed or being overridden — check Cloudflare Pages deployment |
