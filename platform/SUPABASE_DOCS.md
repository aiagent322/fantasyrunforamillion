# Fantasy Run For A Million — Supabase Email Capture

> **Provider:** Supabase  
> **Project:** `ptuuuishzwwgmaexneul`  
> **Table:** `public.email_subscribers`  
> **Status:** Configured — anon key required before go-live  
> **Outbound email (Resend):** Optional — not connected yet

---

## Quick Start

### 1. Run the SQL migration

Open the Supabase SQL Editor and run the migration file:

```
Dashboard: https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/sql
File:      /platform/sql/001_email_subscribers.sql
```

This creates the `email_subscribers` table, enables RLS, and adds the anon insert-only policy.

### 2. Get your anon key

```
Dashboard: https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/settings/api
Section:   Project API Keys → anon / public
```

The anon key is safe to use in client-side JavaScript. It is restricted by Row Level Security — the anon role can only INSERT into `email_subscribers`. It cannot read, update, or delete.

**Never use or expose the service role key on the frontend.**

### 3. Set the key (choose one method)

#### Method A — Gitignored key file (recommended for local dev)

```bash
# 1. Copy the example file
cp engine/supabase-keys.example.js engine/supabase-keys.js

# 2. engine/supabase-keys.js is already in .gitignore — won't be committed

# 3. Edit engine/supabase-keys.js, add your real key:
window.FRFAM_SUPABASE_ANON_KEY = 'eyJhbGci...your-actual-key...';

# 4. Add <script src="/engine/supabase-keys.js"></script> to all pages
#    Run the injection script:
#    python3 /home/claude/inject_supabase_key_script.py
```

#### Method B — Cloudflare Pages environment variable (recommended for production)

```bash
# In Cloudflare Pages dashboard:
# Settings → Environment Variables → Add variable
# Name:  FRFAM_SUPABASE_ANON_KEY
# Value: eyJhbGci...your-actual-key...

# Then add a build step that injects it:
# echo "window.FRFAM_SUPABASE_ANON_KEY='$FRFAM_SUPABASE_ANON_KEY';" > engine/supabase-keys.js
```

---

## Table Schema

```sql
CREATE TABLE public.email_subscribers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  source     text,        -- page_type: 'homepage', 'leaderboard', 'article', etc.
  variant    text,        -- form variant: 'waitlist', 'news', 'leaderboard', 'contest'
  page_url   text,        -- pathname at time of signup (e.g. '/leaderboard')
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Indexes

| Index | On | Purpose |
|-------|----|---------|
| `idx_email_subscribers_created_at` | `created_at DESC` | Growth charts, exports |
| `idx_email_subscribers_email` | `lower(email)` | Fast dedup checks |
| `idx_email_subscribers_source_variant` | `source, variant` | Signup attribution |

---

## Row Level Security

### Policy: `anon_insert_only`

```sql
CREATE POLICY "anon_insert_only"
  ON public.email_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

- ✅ `INSERT` — allowed for anon role
- ❌ `SELECT` — blocked for anon (subscribers cannot be read from frontend)
- ❌ `UPDATE` — blocked for anon
- ❌ `DELETE` — blocked for anon

The service role (dashboard, admin queries) retains full access.

---

## How It Works in Production

```
User submits signup form on any page
  │
  └── email-capture.js handleSubmit()
        ├── Validates email format
        ├── Reads window.FRFAM_SUPABASE_ANON_KEY
        ├── If key missing → console warning, show success (demo mode)
        └── If key present → POST to Supabase REST API
              ├── 201 Created → showSuccess()
              ├── 409 Conflict (duplicate email) → showSuccess() silently
              ├── 401/403 (auth/RLS error) → showError('auth_error')
              ├── Network error → showError('network_error')
              └── Other server error → showError('server_error')

  After successful insert OR duplicate:
  └── email-capture.js dispatches 'frfam:signup' CustomEvent
        └── analytics.js fires email_signup_submit to Plausible
              ├── variant: 'waitlist' | 'news' | 'leaderboard' | 'contest'
              └── source: page_type from <body data-page-type>
```

---

## Duplicate Email Handling

The `email` column has a `UNIQUE` constraint. If a subscriber submits with an existing email:

1. Supabase returns `409 Conflict` (or a body with Postgres code `23505`)
2. `email-capture.js` catches this and calls `done()` — shows the success state
3. The user sees a positive confirmation regardless of whether they were already subscribed

This is correct UX (and privacy) practice — never confirm to a user whether a given email is already in the database.

---

## Querying Subscribers (Dashboard / Admin Only)

All queries run through the Supabase dashboard using the service role — never from the frontend.

```sql
-- Total subscriber count
SELECT COUNT(*) FROM email_subscribers;

-- Growth over time
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) AS new_subscribers
FROM email_subscribers
GROUP BY 1 ORDER BY 1 DESC;

-- By source (which page drives the most signups)
SELECT source, COUNT(*) AS count
FROM email_subscribers
GROUP BY source ORDER BY count DESC;

-- By variant (which form drives the most signups)
SELECT variant, COUNT(*) AS count
FROM email_subscribers
GROUP BY variant ORDER BY count DESC;
```

---

## Outbound Email (Future — Resend)

Resend is the recommended future integration for sending actual emails to subscribers. It requires a server-side component (Cloudflare Worker or Supabase Edge Function) and a verified sending domain.

**Do not add Resend to the frontend.** The Resend API key must never appear in client-side JavaScript.

When ready:
1. Create `platform/workers/send-welcome-email.js` (Cloudflare Worker)
2. Trigger it via Supabase Database Webhook on `email_subscribers` INSERT
3. Configure `hello@fantasyrunforamillion.com` as the sending address

---

## Security Notes

| What | Status |
|------|--------|
| Anon key in client JS | ✅ Safe — protected by RLS |
| Service role key | ❌ Never expose — dashboard only |
| `engine/supabase-keys.js` | ✅ In `.gitignore` |
| Subscriber data readable by anon | ❌ Blocked by RLS (SELECT not allowed) |
| Duplicate emails | ✅ Handled gracefully (silent success) |
| GDPR/CCPA | ⚠️ Add unsubscribe mechanism before large-scale sending |

---

## Go-Live Checklist

- [ ] Run `/platform/sql/001_email_subscribers.sql` in Supabase SQL Editor
- [ ] Verify table + RLS + policy created (see verification queries at bottom of SQL file)
- [ ] Copy `engine/supabase-keys.example.js` → `engine/supabase-keys.js` (gitignored)
- [ ] Add real anon key to `supabase-keys.js`
- [ ] Add `<script src="/engine/supabase-keys.js">` to all pages (before email-capture.js)
- [ ] Deploy to Cloudflare Pages
- [ ] Submit test email via signup form
- [ ] Confirm row appears in Supabase `email_subscribers` table
- [ ] Confirm `email_signup_submit` appears in Plausible dashboard
- [ ] Confirm duplicate email shows success (not error) on resubmit
