# Fantasy Run For A Million — Platform Documentation

> **Version:** 1.0.0  
> **Status:** MVP Active  
> **Last Updated:** 2025  
> **Maintainer:** Bridle & Bit Media / aiagent322

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Page Inventory](#4-page-inventory)
5. [Design System](#5-design-system)
6. [Generator Scripts](#6-generator-scripts)
7. [Data Architecture](#7-data-architecture)
8. [SEO System](#8-seo-system)
9. [Engine Modules](#9-engine-modules)
10. [Deployment Pipeline](#10-deployment-pipeline)
11. [Recommended Next Development Phases](#11-recommended-next-development-phases)
12. [Expansion Roadmap](#12-expansion-roadmap)
13. [Content Conventions](#13-content-conventions)
14. [Rider Profile Workflow](#14-rider-profile-workflow)

---

## 1. Project Overview

**Fantasy Run For A Million** is a free-to-play western performance horse fantasy sports platform and media hub. Fans select riders from reining, cow horse, and cutting disciplines, earn points from official event results, and compete on the fan leaderboard.

The platform is built as a **static HTML site** deployed via GitHub → Cloudflare Pages. No server-side rendering. No runtime dependencies. AI is used as the development tool; the deployed output is plain HTML/CSS/JS.

**Positioning:** Western performance horse fantasy sports + western sports media. Not a gambling platform. Free to play. Not affiliated with The Run For A Million or any governing body.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Hosting | Cloudflare Pages | Auto-deploys from GitHub on push |
| Repository | GitHub (`aiagent322/[repo-name]`) | Branch: main |
| Build system | None — static HTML | No bundler, no framework |
| Styling | Inline CSS (per-page) | CSS custom properties (vars) for design tokens |
| JS | Vanilla ES5+ | No frameworks, no npm dependencies |
| Fonts | Google Fonts CDN | Playfair Display + DM Sans |
| Images | Cloudflare Images CDN | `imagedelivery.net/9VlM7Y9GaQMXOu5Ypg50yA/{id}/public` |
| Data | Static JSON files (`/data/`) | Future: Supabase |
| Database | Supabase (planned) | Project ref: `ptuuuishzwwgmaexneul` |
| CMS | None yet | Future: Sanity or Contentful |
| Analytics | TBD | Add before launch |
| Generator | Python 3 scripts | See `/engine/` and root `.py` files |

---

## 3. Directory Structure

```
/                               ← Root (deploys to fantasyrunforamillion.com)
├── index.html                  ← Homepage
├── _redirects                  ← Cloudflare Pages redirect rules
├── robots.txt                  ← Allows all crawlers, points to sitemap
├── sitemap.xml                 ← 33+ URLs, updated on each expansion
│
├── data/                       ← Static data files (source of truth)
│   ├── riders.json             ← All 24 riders, full schema
│   ├── events.json             ← Event database
│   ├── scoring-config.json     ← Fantasy scoring rules as data
│   └── articles.json          ← Article/content schema
│
├── engine/                     ← JS engine modules (currently stubs)
│   ├── fantasy-scoring.js      ← Scoring calculation functions
│   └── data-loader.js          ← CMS/API connector stubs
│
├── about/index.html
├── contact/index.html
├── faq/index.html
├── how-it-works/index.html
├── leaderboard/index.html
├── pick-your-team/index.html
├── scoring-rules/index.html
├── top-riders/index.html
├── media/index.html
│
├── riders/
│   ├── index.html              ← Rider hub
│   ├── reining/
│   │   ├── index.html          ← Reining discipline listing (8 riders)
│   │   ├── andrea-fappani/
│   │   ├── casey-deary/
│   │   └── cade-mccutcheon/
│   ├── cow-horse/
│   │   ├── index.html
│   │   ├── corey-cushing/
│   │   ├── boyd-rice/
│   │   └── chris-dawson/
│   └── cutting/
│       ├── index.html
│       ├── adan-banuelos/
│       ├── beau-galyean/
│       └── austin-shepard/
│
├── disciplines/
│   ├── reining/index.html      ← Educational discipline pages
│   ├── cow-horse/index.html
│   └── cutting/index.html
│
├── events/
│   ├── index.html              ← Events hub
│   ├── run-for-a-million/      ← Active fantasy anchor event
│   ├── nrha-futurity/          ← Expansion placeholder
│   ├── ncha-futurity/          ← Expansion placeholder
│   └── nrcha-snaffle-bit/      ← Expansion placeholder
│
├── news/
│   ├── index.html              ← News hub (all disciplines)
│   ├── reining/index.html
│   ├── cow-horse/index.html
│   └── cutting/index.html
│
└── generate_profiles.py        ← Rider profile generator (run locally)
```

---

## 4. Page Inventory

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/` | `index.html` | ✅ Live | Hero, disciplines, how-it-works, event, CTA |
| `/how-it-works` | `how-it-works/index.html` | ✅ Live | 5-step format explainer |
| `/scoring-rules` | `scoring-rules/index.html` | ✅ Live | Points table, bonuses, discipline notes |
| `/riders` | `riders/index.html` | ✅ Live | Hub with 3 discipline cards |
| `/riders/reining` | `riders/reining/index.html` | ✅ Live | 8 riders, client-side search |
| `/riders/cow-horse` | `riders/cow-horse/index.html` | ✅ Live | 8 riders, client-side search |
| `/riders/cutting` | `riders/cutting/index.html` | ✅ Live | 8 riders, client-side search |
| `/riders/reining/{slug}` | `riders/reining/{slug}/index.html` | ✅ 3 of 8 | 5 remaining via generator |
| `/riders/cow-horse/{slug}` | `riders/cow-horse/{slug}/index.html` | ✅ 3 of 8 | 5 remaining |
| `/riders/cutting/{slug}` | `riders/cutting/{slug}/index.html` | ✅ 3 of 8 | 5 remaining |
| `/leaderboard` | `leaderboard/index.html` | ✅ Live | Sample data, demo mode |
| `/pick-your-team` | `pick-your-team/index.html` | ✅ Live | Demo builder, no submissions |
| `/top-riders` | `top-riders/index.html` | ✅ Live | All 24 riders by discipline |
| `/disciplines/reining` | `disciplines/reining/index.html` | ✅ Live | Educational + riders |
| `/disciplines/cow-horse` | `disciplines/cow-horse/index.html` | ✅ Live | Educational + riders |
| `/disciplines/cutting` | `disciplines/cutting/index.html` | ✅ Live | Educational + riders |
| `/events` | `events/index.html` | ✅ Live | Events hub |
| `/events/run-for-a-million` | `events/run-for-a-million/index.html` | ✅ Live | Active fantasy event |
| `/events/nrha-futurity` | `events/nrha-futurity/index.html` | ✅ Placeholder | Expansion ready |
| `/events/ncha-futurity` | `events/ncha-futurity/index.html` | ✅ Placeholder | Expansion ready |
| `/events/nrcha-snaffle-bit` | `events/nrcha-snaffle-bit/index.html` | ✅ Placeholder | Expansion ready |
| `/news` | `news/index.html` | ✅ Live | Editorial hub (demo content) |
| `/news/reining` | `news/reining/index.html` | ✅ Live | Reining editorial |
| `/news/cow-horse` | `news/cow-horse/index.html` | ✅ Live | Cow horse editorial |
| `/news/cutting` | `news/cutting/index.html` | ✅ Live | Cutting editorial |
| `/media` | `media/index.html` | ✅ Placeholder | Podcasts, video, interviews |
| `/faq` | `faq/index.html` | ✅ Live | 14 Q&A pairs, CSS accordion |
| `/about` | `about/index.html` | ✅ Live | Platform overview |
| `/contact` | `contact/index.html` | ✅ Live | 4 contact cards |

**Total: 31 HTML pages, 33 sitemap URLs**

---

## 5. Design System

All pages share identical CSS custom properties. Never break these tokens.

```css
:root {
  /* Colors */
  --black:        #0e0b08;   /* Nav background */
  --dark:         #1a1410;   /* Page background */
  --dark-mid:     #241c14;   /* Card/section background */
  --leather:      #8B5E3C;   /* Accent warm */
  --gold:         #C9A84C;   /* Primary accent — all CTAs, labels */
  --gold-light:   #e8c96a;   /* Hover state for gold */
  --rust:         #C4622D;   /* Warning/demo badges */
  --cream:        #F5EDD6;   /* Primary text */
  --cream-dim:    #c8bc9e;   /* Secondary text, descriptions */
  --white:        #ffffff;   /* Headings */

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;  /* H1, H2, H3, numbers */
  --font-body:    'DM Sans', sans-serif;               /* Body, nav, UI */

  /* Layout */
  --radius:    6px;
  --radius-lg: 12px;
  --max-w:     1100px;
  --tr:        0.22s ease;
}
```

### Component Patterns

| Component | CSS Class | Used By |
|-----------|-----------|---------|
| Page header | `.page-header` | All interior pages |
| Breadcrumb | `.breadcrumb` | All interior pages |
| Section label | `.section-label` | All sections |
| Divider | `.divider` | Below section labels |
| News card | `.news-card` | `/news/*` pages |
| Rider mini card | `.rider-mini` | Discipline pages |
| Rider top card | `.top-rider-card` | `/top-riders` |
| Rider profile card | `.rider-card` | `/riders/{disc}` listing |
| Demo notice | `.demo-notice` / `.demo-banner` | All placeholder content |
| FAQ accordion | `details/summary` | `/faq` |
| Skip link | `.skip-link` | All pages (accessibility) |

### Mobile Breakpoints
- **900px** — Nav collapses to hamburger; 3-col grids become 2-col
- **640px** — 2-col grids become 1-col; hero stacks vertically
- **480px** — Minimum target (320px via CSS but 480px tested)

---

## 6. Generator Scripts

### `generate_profiles.py`
Generates individual rider profile pages from the `RIDERS` data list.

**To add a new rider:**
1. Add entry to `RIDERS` list in `generate_profiles.py`
2. Set `"profiled": True` in `data/riders.json` for that rider
3. Run: `python3 generate_profiles.py`
4. Verify output in `riders/{discipline}/{slug}/index.html`
5. Add route to `sitemap.xml`
6. Push to GitHub → Cloudflare auto-deploys

**Current status:** 9 of 24 riders profiled. 15 remaining.

### `content_expansion.py`
Generates: news hub, discipline news pages, discipline educational pages, events hub, RFM event page, top riders, FAQ, media hub, expansion event pages.

**To rebuild:** `python3 content_expansion.py`

**To add a new news discipline:**  
Add to `NEWS_{DISCIPLINE}` array and add a call to `build_news_disc()`.

### `seo_pass.py`
Applies SEO improvements across all HTML files:
- Canonical tags, OG tags, Twitter Card, JSON-LD schema
- Fix nav CTA hrefs
- Update meta titles and descriptions

**Run after any structural changes:** `python3 seo_pass.py`

### `production_pass.py`
Applies production hardening across all HTML files:
- Standardized footer
- Skip links
- Theme color + favicon
- Copyright

**Run before any deployment:** `python3 production_pass.py`

---

## 7. Data Architecture

### Source of Truth Hierarchy
```
data/riders.json          ← Rider master data
data/events.json          ← Event database
data/scoring-config.json  ← Scoring rules (version controlled)
data/articles.json        ← Content schema + placeholder articles
```

### Future Supabase Tables
```sql
-- When backend is activated:
CREATE TABLE riders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  discipline   TEXT NOT NULL,
  hometown     TEXT,
  fantasy_eligible BOOLEAN DEFAULT TRUE,
  profiled     BOOLEAN DEFAULT FALSE,
  profile_url  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     TEXT NOT NULL,
  rider_id     TEXT NOT NULL,
  discipline   TEXT NOT NULL,
  class_name   TEXT,
  place        INTEGER,
  score        NUMERIC(6,2),
  qualified    BOOLEAN DEFAULT TRUE,
  disqualified BOOLEAN DEFAULT FALSE,
  bonuses_earned JSONB DEFAULT '[]',
  posted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fantasy_teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name    TEXT NOT NULL,
  email        TEXT,
  event_id     TEXT NOT NULL,
  reining      TEXT[] NOT NULL,
  cow_horse    TEXT[] NOT NULL,
  cutting      TEXT[] NOT NULL,
  bonus_rider  TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leaderboard (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES fantasy_teams(id),
  event_id        TEXT NOT NULL,
  total_points    INTEGER DEFAULT 0,
  placement_pts   INTEGER DEFAULT 0,
  bonus_pts       INTEGER DEFAULT 0,
  rank            INTEGER,
  breakdown       JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Scoring Config Versioning
The scoring config in `data/scoring-config.json` is **versioned**. Every change to point values must:
1. Increment the `scoring_version` field
2. Be published to `/scoring-rules` page before entry opens
3. Be announced to participants before their team locks

---

## 8. SEO System

### Conventions
- **Title format:** `{Page Name} | {Site Name}`
- **Meta description:** Max 160 chars, keyword-rich, unique per page
- **Canonical:** `https://fantasyrunforamillion.com{path}` — no trailing slash
- **OG image:** `https://fantasyrunforamillion.com/og-image.jpg` — **needs to be created**
- **JSON-LD:** WebSite + Organization on homepage; BreadcrumbList on all interior pages

### Keyword Themes
Primary: `western performance horse fantasy`, `reining fantasy game`, `cow horse fantasy sports`, `cutting horse fantasy`, `Run For A Million fantasy`, `fantasy horse sports`

Long-tail: `how does reining scoring work`, `NRHA competition explained`, `cow horse composite scoring`, `NCHA cutting judging`, `western horse fantasy team`

### Sitemap Update Process
1. Add new route to `sitemap.xml`
2. Set `<changefreq>` and `<priority>` appropriately
3. Submit updated sitemap to Google Search Console after deploy

---

## 9. Engine Modules

### `engine/fantasy-scoring.js`
Pure JavaScript scoring functions. Zero dependencies. Fully documented with JSDoc.

**Key functions:**
- `getPlacementPoints(result)` — Points for a single rider result
- `getBonusPoints(result)` — Bonus points for a result
- `calculateTeamScore(team, results)` — Full team score calculation
- `rankTeams(teams, results)` — Sort and rank all teams
- `validateTeamRoster(team, riders)` — Validate roster slot compliance
- `demoScoringRun()` — Test with sample data

**To activate:** Import into leaderboard page, connect to real results data from Supabase.

### `engine/data-loader.js`
CMS/API connector stubs. Currently returns static JSON file data.

**Key functions:**
- `loadRiders(filters?)` — All 24 riders (currently from `/data/riders.json`)
- `loadEvents(filters?)` — All events
- `loadScoringConfig()` — Scoring configuration
- `loadEventResults(event_id)` — STUB — returns [] until Supabase connected
- `loadLeaderboard(event_id, limit)` — STUB — returns [] until Supabase connected
- `submitFantasyTeam(teamData)` — STUB — logs but does not persist

**To activate:** Replace stub return statements with Supabase client calls.

---

## 10. Deployment Pipeline

```
Developer machine
  └── Edit HTML / run Python generators
  └── Run seo_pass.py + production_pass.py
  └── Update sitemap.xml
  └── git add . && git commit -m "..."
  └── git push (requires approval per project rules)
      ↓
GitHub (aiagent322/[repo-name])
      ↓
Cloudflare Pages (auto-deploy, ~1-2 min)
      ↓
Live at fantasyrunforamillion.com
      ↓
Purge Cloudflare cache if needed
```

**Credentials:**
- GitHub PAT: `[see secure credential store — never commit]`
- Cloudflare Account ID: `be3392b6f5b8a1eb187da0577987a019`
- Cloudflare Pages API token: `[see secure credential store — never commit]`
- Committer: `Rex Wager <rexwager@aol.com>`

**RULE: Never push to GitHub without explicit approval from Rex.**

---

## 11. Recommended Next Development Phases

### Phase 1 — Immediate
- [ ] Create `og-image.jpg` (1200×630) — required for social share previews on all 35 pages
- [ ] Confirm production domain and update canonical URLs if different from `fantasyrunforamillion.com`
- [ ] Configure email inbox for contact page (`hello@fantasyrunforamillion.com`)
- [ ] Submit `sitemap.xml` to Google Search Console

### Phase 2 — Pre-Event
- [ ] Complete remaining 15 rider profiles using `generate_profiles.py`
- [ ] Finalize scoring rules — update `data/scoring-config.json` with confirmed values
- [ ] Publish and verify `/scoring-rules` reflects final confirmed point structure

### Phase 3 — Contest Launch
- [ ] Wire `submitFantasyTeam()` in `engine/data-loader.js` to Supabase backend
- [ ] Replace demo mode in `/pick-your-team` with real submission flow

### Phase 4 — Live Event
- [ ] Connect scoring engine (`engine/fantasy-scoring.js`) to official results feed
- [ ] Activate live leaderboard — replace sample data in `/leaderboard` with real scores

### Phase 5 — Post-Event
- [ ] Archive final results and standings
- [ ] Publish editorial recap via `/news`
- [ ] Plan next event expansion (NRHA Futurity, NCHA Futurity, or NRCHA Snaffle Bit)

---

## 12. Expansion Roadmap

### Western Fantasy Sports Network
The architecture is intentionally designed to support multiple fantasy game properties:

```
fantasyrunforamillion.com     ← Active (current)
  └── Run For A Million (reining + cow horse + cutting)

Future properties (same architecture):
├── NRHA Futurity Fantasy       → /events/nrha-futurity
├── NCHA Futurity Fantasy       → /events/ncha-futurity
├── NRCHA Snaffle Bit Fantasy   → /events/nrcha-snaffle-bit
└── NFR / Rodeo Fantasy         → New domain or sub-path
```

Each expansion event follows the same pattern:
1. Add event to `data/events.json`
2. Create event page from `build_event_template()` in generator
3. Create discipline-specific rider roster
4. Configure scoring in `data/scoring-config.json`
5. Activate when contest is ready

### Rider Page Scaling
The rider profile system is designed to support thousands of pages:
- Generator reads from `data/riders.json`
- Each profile is ~30KB (well under Cloudflare Pages limits)
- URL pattern: `/riders/{discipline}/{slug}` is clean and consistent
- Cloudflare Pages supports up to 20,000 files per project

### Content Scaling
The news/article system supports:
- Individual article URLs: `/news/{category}/{slug}`
- Author pages: `/news/author/{slug}`
- Tag pages: `/news/tag/{tag}`
- Year archives: `/news/{year}/`

All follow the same HTML template pattern — generate at build time.

---

## 13. Content Conventions

### What To Publish
✅ Educational western horse sports content  
✅ Fantasy strategy guides  
✅ Rider backgrounds and career overviews  
✅ Discipline explanations and judging guides  
✅ Event overviews (clearly labeled as not official)  

### What NOT To Publish
❌ Official event news claimed as authoritative  
❌ Invented statistics or fabricated results  
❌ Any gambling, wagering, or betting language  
❌ Claims of affiliation with governing bodies  
❌ Financial promises or prize claims  

### Disclaimer Requirements
Every page must include at minimum:
> "Fan engagement platform — not affiliated with, sponsored by, or officially connected to The Run For A Million or its organizers. No gambling, wagering, or financial transactions of any kind."

Event pages must add:
> "Not an official source. This is an educational overview for fantasy game purposes."

---

## 14. Rider Profile Workflow

### Adding a New Rider Profile

1. **Update `data/riders.json`** — Set `"profiled": true`, add bio copy, SEO fields

2. **Add to `generate_profiles.py`** — Add entry to `RIDERS` list:
```python
{
    "name":      "Rider Full Name",
    "slug":      "rider-full-name",
    "disc":      "Reining",          # or "Cow Horse" or "Cutting"
    "disc_slug": "reining",
    "disc_icon": "🐴",
    "disc_num":  "01",
    "hometown":  "City, ST",
    "meta_desc": "SEO meta description...",
    "intro":     "Bio paragraph...",
    "highlights": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4"],
    "events":    "Event appearance description...",
    "disc_spec": "Discipline specialization paragraph...",
    "fv_note":   "Fantasy value paragraph...",
},
```

3. **Run generator:** `python3 generate_profiles.py`

4. **Update discipline listing page** — The generator script automatically patches the listing page (`riders/{discipline}/index.html`) to activate the "View Profile" button for profiled riders.

5. **Update `sitemap.xml`** — Add the new `/riders/{discipline}/{slug}` URL.

6. **Run SEO pass** — `python3 seo_pass.py` (adds canonical, OG tags if needed)

7. **Push and deploy** — After Rex approval.

---

*Last generated by Claude (Anthropic). Platform built and maintained by Bridle & Bit Media.*
