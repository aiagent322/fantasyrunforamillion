# Fantasy Run For A Million — Scoring Architecture

> **Version:** 1.0.0  
> **Status:** Schema ready — awaiting live event results  
> **Scoring engine:** `/engine/fantasy-scoring.js`  
> **Admin pages:** `/admin/results`, `/admin/leaderboard`

---

## 1. Tables Overview

### `public.event_results`
Official results per rider per discipline at each event.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `event_slug` | text | e.g. `run-for-a-million-2025` |
| `discipline` | text | `reining` \| `cow-horse` \| `cutting` |
| `rider_slug` | text | matches `riders.json` slugs |
| `placing` | integer | 1 = first |
| `score` | numeric | raw competition score |
| `fantasy_points` | integer | computed from placing + bonuses |
| `bonus_flags` | text[] | e.g. `['comeback_rider', 'fan_favorite']` |
| `notes` | text | admin notes (DQ, scratch, etc.) |
| `entered_by` | text | admin identifier (future auth) |
| `created_at` | timestamptz | insert time |
| `updated_at` | timestamptz | auto-updated via trigger |

**RLS:** No anon access. Service role only (via Cloudflare Worker proxy).

### `public.leaderboard_snapshots`
Computed team standings after each scoring run.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `event_slug` | text | event identifier |
| `fantasy_team_id` | uuid | FK → `fantasy_teams.id` |
| `total_points` | integer | placement + bonus points |
| `bonus_points` | integer | bonus component only |
| `rank` | integer | 1 = first, ties share rank |
| `rider_count` | integer | riders with results entered |
| `is_current` | boolean | only `true` rows serve public leaderboard |
| `snapshot_date` | timestamptz | when this snapshot was generated |

**RLS:** Anon SELECT allowed where `is_current = true` — public leaderboard reads this directly.

---

## 2. Scoring Calculation Flow

```
Admin enters official results
  └── /admin/results (Worker-proxied POST)
        ├── fantasy_points calculated inline (calculateFantasyPoints(placing))
        └── INSERT into public.event_results

Admin triggers "Run Scoring"
  └── /admin/leaderboard
        ├── Load all fantasy_teams + fantasy_team_riders from Supabase (via Worker)
        ├── Load all event_results for this event (via Worker)
        ├── calculateLeaderboard(teams, results) → TeamScore[]
        ├── applyDisciplineBonuses() → bonus points per team
        ├── rankLeaderboard(scores) → sorted with tied ranks
        └── generateLeaderboardSnapshot(ranked) → DB-ready rows

Admin clicks "Push to Supabase"
  └── Worker receives snapshot array
        ├── UPSERT into leaderboard_snapshots (ON CONFLICT ON CONSTRAINT unique_current_snapshot)
        └── is_current = true → immediately visible to public /leaderboard page

Public /leaderboard page
  └── Reads from leaderboard_snapshots WHERE is_current = true ORDER BY rank ASC
```

---

## 3. Point Structure

### Placement Points

| Placing | Points |
|---------|--------|
| 1st | 100 |
| 2nd | 80 |
| 3rd | 65 |
| 4th | 50 |
| 5th | 40 |
| 6th–10th | 25 each |
| Qualified (11th+) | 10 |
| DQ / DNS | 0 |

### Bonus Events

| Bonus | Points | Trigger |
|-------|--------|---------|
| Discipline Winner | +25 | Auto — rider placing = 1 in their discipline |
| Highest Composite Score | +20 | Auto — rider has highest `score` in discipline |
| Comeback Rider | +15 | Manual — `bonus_flags: ['comeback_rider']` |
| Rookie / Underdog | +15 | Manual — `bonus_flags: ['rookie_underdog']` |
| Fan Favorite | +10 | Manual — `bonus_flags: ['fan_favorite']` |

### Tiebreaker Order

1. Most discipline winner bonuses (per team)
2. Best single placing across all riders on the team
3. Earliest team submission (by `fantasy_team_id` UUID sort as proxy)

---

## 4. Discipline-Specific Scoring Notes

### Reining
- Single class result. Placing = NRHA open class final placing.
- No composite calculation required.
- `score` = pattern score (e.g. 221.5)

### Cow Horse (Composite)
- Three-phase competition: reined work + fence work + cow work.
- `placing` = composite placing (not individual phase placing).
- `score` = composite total across all three phases (e.g. 438.5)
- If only phase results are available before composite is calculated, hold result entry until composite is published.

### Cutting
- Single class result. Placing = NCHA open class final placing.
- `score` = 0–80 scale cutting run score.
- Qualified run = completed run, no DQ, regardless of placing.

---

## 5. Admin Authentication (Current vs Future)

### Current State
Admin pages at `/admin/*` are:
- `robots.txt` disallowed (not indexed)
- Not linked from any public page
- Running in local/mock mode
- All writes require `FRFAM_ADMIN_ENDPOINT` (Cloudflare Worker URL)

The Worker holds `SUPABASE_SERVICE_ROLE_KEY` as an environment variable. **The service key is never in any client-side HTML or JavaScript.**

### Future: Supabase Auth Integration

When admin authentication is added:

1. Deploy Supabase Auth with email magic link (simplest pattern for internal admin)
2. Create admin user in `auth.users`
3. Add `role: 'admin'` to user's JWT metadata
4. Add RLS policy to `event_results`:
   ```sql
   CREATE POLICY "admin_all_event_results"
     ON public.event_results FOR ALL TO authenticated
     USING (auth.jwt() ->> 'role' = 'admin')
     WITH CHECK (auth.jwt() ->> 'role' = 'admin');
   ```
5. Admin pages call Supabase Auth SDK to log in, then use session JWT for all requests
6. Remove Worker proxy requirement for event_results (direct auth replaces it)

---

## 6. Cloudflare Worker: Admin Proxy

The admin Worker (to be built at `platform/workers/admin-proxy.js`) needs to handle:

```
POST /api/admin/results       → INSERT into event_results
POST /api/admin/leaderboard   → UPSERT into leaderboard_snapshots
GET  /api/admin/teams         → SELECT from fantasy_teams + fantasy_team_riders
GET  /api/admin/results/:event → SELECT from event_results WHERE event_slug = ?
```

Worker environment variables required:
```
SUPABASE_URL              = https://ptuuuishzwwgmaexneul.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [never expose — Worker env only]
ADMIN_SECRET              = [simple shared secret for interim auth]
```

Set in admin pages before Worker endpoint is live:
```javascript
window.FRFAM_ADMIN_ENDPOINT = 'https://frfam-admin.bridleandbit.workers.dev';
```

---

## 7. Live Scoring Integration (Future)

When live scoring is ready to be exposed publicly:

1. Update `/leaderboard/index.html` to fetch from Supabase:
   ```javascript
   fetch('https://ptuuuishzwwgmaexneul.supabase.co/rest/v1/leaderboard_snapshots' +
     '?event_slug=eq.run-for-a-million-2025&is_current=eq.true&order=rank.asc',
     { headers: { apikey: window.FRFAM_SUPABASE_ANON_KEY } })
   ```
2. Replace demo TEAMS array with live data from Supabase
3. Add polling interval or Supabase Realtime subscription for live updates
4. Consider Cloudflare CDN caching for leaderboard responses (5-minute TTL)

---

## 8. Rider Slug Reference

All rider slugs in `event_results` must match slugs stored in `fantasy_team_riders`.
Both are derived from `nameToSlug()` in `/engine/team-submit.js`:

```javascript
"Andrea Fappani" → "andrea-fappani"
"Cade McCutcheon" → "cade-mccutcheon"
"Adan Banuelos" → "adan-banuelos"
```

**Before entering results:** Cross-reference `fantasy_team_riders` table in Supabase to confirm exact slugs used during team submission. Any mismatch will result in those riders showing 0 points.

Full rider list in `/data/riders.json`.

---

## 9. Analytics Events (Prepared, Not Active)

| Event | Source | When |
|-------|--------|------|
| `admin_result_submit` | `/admin/results` JS | Each result added |
| `leaderboard_recalculate` | `/admin/leaderboard` JS | Scoring run triggered |
| `scoring_update` | `/admin/leaderboard` JS | Snapshot pushed to Supabase |

These fire as CustomEvents on `document` — `analytics.js` can listen and forward to Plausible if `EVENTS` is extended to include admin events.
