# Fantasy Run For A Million — Cross-Linking System

`platform/CROSSLINKS_DOCS.md`  
Version: 1.0 | Engine: `engine/cross-links.js`

---

## Overview

The cross-link engine is a single lightweight JavaScript module that automatically
injects contextually relevant related-content blocks into every page type on the site.
It runs after the page loads (deferred), fetches data from the existing JSON data files,
and inserts related riders, articles, events, and fantasy tools into the right locations
based on the current page's context.

**Design goals:**
- Zero additional build steps — works with the existing static HTML architecture
- Single file, single fetch per data source (in-memory cached)
- Graceful degradation: if JS or fetch fails, pages remain fully functional
- No duplicate link injection (idempotent — safe to load multiple times)
- Reuses existing CSS classes and design tokens everywhere possible

---

## File

```
engine/cross-links.js          ← the engine (single file, ~280 lines)
platform/CROSSLINKS_DOCS.md   ← this document
```

---

## How It Works

### 1. Page detection

The engine reads `body[data-page-type]` on load and routes to the correct handler.
All page types already emit this attribute.

| `data-page-type`   | Additional attributes used             |
|--------------------|----------------------------------------|
| `rider_profile`    | `data-rider-slug`, `data-rider-discipline` |
| `article`          | `data-article-slug`, `data-article-category` |
| `discipline_page`  | `data-discipline`                      |
| `events_page`      | `data-event-slug`                      |

### 2. Data loading

Three JSON files are fetched once and cached in memory for the session:

```
/data/riders.json      →  d.riders[]
/data/articles.json    →  d.placeholder_articles[]
/data/events.json      →  d.events[]
```

All three are fetched in parallel via `Promise.all()`. If any fetch fails,
that handler returns early — no broken UI, no console errors.

### 3. Matching heuristics

Simple rules, no ML or scoring weights:

| Match type         | Logic                                              |
|--------------------|----------------------------------------------------|
| Same discipline    | `article.discipline === pageDiscipline`            |
| Same category      | `article.category === pageDiscipline` (fallback)  |
| Rider mention      | `article.rider_references[].includes(riderSlug)`  |
| Fantasy content    | `category === 'fantasy-tips'` or `'rider-profiles'` |
| Event discipline   | `event.disciplines[].includes(discipline)`         |

Results are de-duplicated by slug before injection. Sliced to max per config:

```js
MAX = { riders: 6, articles: 3, events: 3 }
```

### 4. CSS injection

The engine injects a single `<style id="xlink-css">` block on first use.
All injected classes are prefixed `xl-` to avoid collisions with existing styles.
On page types where existing CSS classes exist (e.g., `.sidebar-card`, `.related-link-item`
on article pages; `.sidebar-card`, `.sidebar-link` on discipline pages), the engine
reuses those classes directly — no duplication.

---

## What Gets Injected, By Page Type

### Rider Profile Pages

**Sidebar (`.sidebar-col`) — appended:**
- `xl-sc` card: *Strategy Articles* — articles where `rider_references` includes this rider
- `xl-sc` card: *Related Events* — events in this rider's discipline + link to /events

**Before `.back-nav` — inserted:**
- `<section class="xl-sect xl-alt">` *Related Articles* grid  
  Pool: rider-referenced articles + same-discipline articles + fantasy-tips fallback  
  Max: 3 cards

### Article Pages

**Sidebar (`.article-sidebar`) — appended:**
- `.sidebar-card` *Related Events* — events for article's discipline (or RFM anchor event)
- `.sidebar-card` *Fantasy Tools* — Build Your Team, Scoring Rules, Leaderboard  
  (skipped if article is already in `fantasy-tips` category)

**`.related-articles .article-cards` — replaced with smarter pool:**
- Same category + same discipline + shared rider references + fantasy-tips fallback

### Discipline Pages

**`.disc-article-cards` strip — augmented:**
- Adds up to 2 extra article cards not already shown (byDisc + fantasyArts fallback)

**`.disc-sidebar` — appended:**
- `.sidebar-card` *Strategy Articles* — discipline articles + fantasy-tips mix (max 3)

**`<main>` — appended:**
- `<section class="xl-sect">` *Related Events* grid — events for this discipline

### Event Pages

**`<main>` — appended (in order):**
1. `<section class="xl-sect xl-alt">` *Eligible Riders* grid — profiled riders in event's disciplines
2. `<section class="xl-sect">` *Related Articles* grid — event refs + fantasy-tips + discipline articles

**`main aside` — appended:**
- Strategy Articles card (inline-styled to match existing aside styling)

---

## Internal Linking Patterns

### Anchor text strategy

| Context               | Anchor text pattern                         |
|-----------------------|---------------------------------------------|
| Rider profile link    | `[Rider Full Name]` — "View Profile →"      |
| Article link          | `[Article Title]` — "Read Article"          |
| Event link            | `[Event Name]` — "Event Overview"           |
| Discipline link       | `[Discipline Name] Discipline Guide`        |
| Roster link           | "All [Discipline] Riders →"                 |
| News link             | "All Articles →"                            |
| Fantasy entry         | "Build Your Team" / "Pick Your Team"        |

Anchor text is always descriptive and contextual. No "click here" or generic labels.

### Crawl flow improvements

The engine eliminates the following orphan risk paths:

- **Rider pages** previously had no outbound article links. Now every profiled
  rider page links to 1–4 relevant articles and 1–3 events.
- **Event pages** previously had no rider links. Now each event page links to
  all profiled riders across its disciplines.
- **Discipline pages** article strip previously showed 2 hardcoded articles.
  Now shows up to 4, plus a sidebar with 3 strategy articles, plus an events section.
- **Article pages** related section was static 3 links. Now computed dynamically
  from category + discipline + rider overlap.

---

## Data Schema Requirements

For articles to participate in cross-linking, they need these fields in `articles.json`:

```json
{
  "slug": "article-slug",
  "title": "Article Title",
  "category": "reining | cow-horse | cutting | fantasy-tips | ...",
  "discipline": "reining | cow-horse | cutting | null",
  "excerpt": "1-2 sentence description",
  "rider_references": ["rider-slug-1", "rider-slug-2"],
  "event_references": ["event-slug-1"]
}
```

For riders, the engine uses `profiled: true` and `profile_url` fields.
Riders with `profiled: false` or no `profile_url` are excluded from injected grids.

---

## Generator Compatibility

`generate_profiles.py` has been patched to include:

```html
<script src="/engine/cross-links.js" defer></script>
```

in the HTML template footer. All future profile regenerations will automatically
include cross-link support without manual patching.

---

## CMS Compatibility Notes

When the platform migrates to a CMS (Sanity, Contentful, or markdown files):

1. **Data source swap** — replace `/data/articles.json` fetch with the CMS API
   endpoint or build-time-generated JSON. Engine URL is configurable via `var DATA`.

2. **Article fields** — the engine uses `placeholder_articles` array key.
   Update the accessor in `getArticles()` when the schema name changes.

3. **Build-time option** — for zero JS dependency, the cross-link engine logic
   can be ported to a build step (Python, Node, or Eleventy/Hugo shortcodes)
   that bakes related-content HTML into each page at build time. The matching
   heuristics in the engine map 1:1 to server-side logic.

4. **Body attributes** — maintain `data-page-type`, `data-rider-slug`,
   `data-article-slug`, `data-discipline`, and `data-event-slug` on `<body>`
   regardless of CMS. The engine depends on these for routing.

---

## SEO Strategy

### Internal authority flow

```
index.html
  ↓
/riders, /news, /disciplines, /events  (hub pages)
  ↓
/riders/{disc}/{slug}  (rider profiles)
  ↓ ← cross-links engine →
/news/{slug}  (articles)
  ↓ ← cross-links engine →
/disciplines/{disc}  (discipline hubs)
  ↓ ← cross-links engine →
/events/{slug}  (event pages)
  ↑_____________↑  (bidirectional via cross-links)
```

### Target keyword themes supported

| Theme                              | Pages linking to it                     |
|------------------------------------|-----------------------------------------|
| fantasy western sports             | all article pages, rider pages, events  |
| reining riders                     | rider profiles, discipline page, events |
| cow horse riders                   | rider profiles, discipline page, events |
| cutting horse riders               | rider profiles, discipline page, events |
| western performance horse competition | discipline pages, event pages        |
| Run For A Million fantasy          | event pages, fantasy-tips articles      |
| fantasy horse sports               | all pages via nav + engine              |

### Long-tail coverage

Each rider profile now links to 2–4 articles containing that rider's name
in the article body and `rider_references`. This creates natural long-tail paths:

```
"andrea fappani reining fantasy" → rider profile → maneuver score article → discipline page
"cow horse fantasy strategy"     → article → discipline page → event page → rider profiles
```

---

## Adding New Articles (Cross-Link Checklist)

When a new article is added to `articles.json`:

1. Set `"category"` accurately — determines which pages it appears on
2. Set `"discipline"` if discipline-specific — enables tighter matching
3. Populate `"rider_references"` with all rider slugs mentioned — critical for rider-page injection
4. Set `"event_references"` if event-specific — enables event page injection
5. Keep `"excerpt"` under 160 chars — used as card description and meta description

---

## Remaining Recommendations for Future SEO Scaling

See `platform/CROSSLINKS_DOCS.md#future` (appended below):

### Short-term (1–3 months)

- **Sitemap update**: regenerate `sitemap.xml` to include `<lastmod>` dates;
  submit to Google Search Console.
- **Internal links in article body**: ensure each article body contains at
  least 2 contextual inline links to rider profiles and discipline pages.
  Current articles already do this — maintain the pattern.
- **Breadcrumb schema**: rider profile and article pages have BreadcrumbList
  JSON-LD. Verify discipline and event pages have it too.
- **News hub category pages** (`/news/reining`, `/news/cow-horse`, `/news/cutting`):
  add cross-link sections to these hub pages via the engine (add `data-page-type`
  to their `<body>` tags).

### Medium-term (3–6 months)

- **Build-time cross-linking**: port the engine matching logic to `generate_profiles.py`
  and a companion `generate_articles.py` so all links are baked into HTML at
  build time, eliminating the JS fetch dependency entirely.
- **Rider data enrichment**: populate `rider.fantasy_stats` fields as RFM
  results become available. Stats on rider profile cards improve engagement
  and dwell time, both indirect ranking signals.
- **Cross-discipline articles**: write articles that explicitly span two disciplines
  (e.g., "Reining vs Cow Horse for Fantasy Picks"). These naturally link rider
  pages across disciplines and improve cross-cluster authority flow.
- **Event-specific rider lists**: add `rider_references` to event JSON records
  so the engine can show discipline-filtered rider grids per event rather than
  showing all profiled riders.

### Long-term (6–12 months)

- **Structured data for riders**: add `Person` or `Athlete` schema JSON-LD
  to rider profile pages to improve rich result eligibility.
- **Article schema**: add `Article` JSON-LD to all news pages with `datePublished`,
  `author`, and `about` (discipline entities).
- **Discipline entity pages**: submit discipline pages as topical authority
  hubs via Google Search Console's URL Inspection tool after populating them
  with more original editorial content.
- **External link equity**: pursue links from NRHA, NRCHA, NCHA news sections
  and western sports publications to rider profile pages — these have existing
  SEO authority and rider names as natural anchor text targets.


---

## v2.0 Changes (Static Baking Added)

### What changed

**`engine/cross-links.js` → v2.0**
- Fixed critical ID placement bug: `sidebarCard()` now puts the `id` attribute on the root
  element so `alreadyInjected()` checks work correctly for static+dynamic hybrid pages
- Added "Discipline Guides" sidebar injection for all article pages
- `discLinksForArticle()` helper: picks specific discipline or all 3 based on article context
- All sidebar card calls now pass explicit IDs for idempotency

**`generate_cross_links.py` (new — build-time static baking)**
- Reads `data/*.json` and patches HTML files with static cross-link sections
- Idempotent: checks for existing element IDs before injecting (safe to re-run)
- Output: static HTML with cross-links baked in at build time (no JS required for SEO)
- Pages modified: all profiled rider pages, article pages, discipline pages, event pages

### Hybrid architecture

```
Static HTML (generate_cross_links.py)       JS layer (cross-links.js)
────────────────────────────────────         ─────────────────────────────────
Baked at build time                          Runs at runtime (deferred)
No JS required — works with JS off           Covers pages not yet statically baked
Full SEO benefit (content in source HTML)    alreadyInjected() prevents duplication
Cloudflare serves instantly from cache       3 JSON fetches, cached in-memory
```

### Re-running the generator

Run after any change to `data/*.json`:

```bash
export GITHUB_TOKEN=your_token_here
python3 generate_cross_links.py
```

The generator will skip pages already patched and only update pages with
stale or missing cross-links.

### Pages patched in v2.0 run

| Page type       | Count patched | Count skipped (already done) |
|-----------------|---------------|------------------------------|
| Rider profiles  | 41            | 0                            |
| Articles        | 7             | 12 (had existing disc links) |
| Discipline      | 3             | 0                            |
| Events          | 4             | 0                            |
| **Total**       | **55**        | **12**                       |
