# Fantasy Run For A Million — Analytics Documentation

> **Version:** 1.1.0  
> **Status:** Plausible activated — awaiting dashboard verification  
> **Provider:** Plausible (`fantasyrunforamillion.com`)  
> **Engine:** `/engine/analytics.js`  
> **Event schema:** `/data/tracking-events.json`  
> **Debug:** `true` — set to `false` only after events verified in Plausible dashboard

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Architecture Overview](#2-architecture-overview)
3. [Event Naming Conventions](#3-event-naming-conventions)
4. [Page Type Taxonomy](#4-page-type-taxonomy)
5. [Enabling a Provider](#5-enabling-a-provider)
6. [Provider Setup Guides](#6-provider-setup-guides)
7. [Key Events Reference](#7-key-events-reference)
8. [Sponsor & Reporting Readiness](#8-sponsor--reporting-readiness)
9. [Privacy Considerations](#9-privacy-considerations)
10. [Development Testing](#10-development-testing)

---

## 1. Current State

**Provider:** Plausible — `fantasyrunforamillion.com`  
**Script variant:** `script.tagged-events.js` (required for custom events)  
**Loaded on:** All 83 pages, in `<head>` with `defer`  
**Debug:** `true` — events log to console AND transmit to Plausible  
**Cookies:** None — Plausible is cookieless by design  
**Consent banner:** Not required — GDPR/CCPA compliant without one

```
[FRFAM Analytics] rider_profile_view        ← console log (debug mode)
  page_type:        "rider_profile"          ← also sent to Plausible
  rider_slug:       "andrea-fappani"
  rider_discipline: "reining"
  Provider: plausible
```

### Turn off debug logging after dashboard verification

Edit `/engine/analytics.js`:
```javascript
debug: false,  // change from: true
```

### GA4 policy

GA4 is **not active**. Add only if sponsor reporting later requires Google ecosystem attribution. Plausible covers all current measurement needs.

---

## 2. Architecture Overview

```
/engine/analytics.js          ← Core engine (all logic here)
/data/tracking-events.json    ← Event schema documentation
/platform/ANALYTICS_DOCS.md   ← This file

<body data-page-type="...">   ← Page classification (all 83 pages)
                              ← Additional data-* attrs on rider/article pages
```

### Signal flow

```
Page loads
  └── analytics.js DOMContentLoaded
        ├── Read <body data-page-type> and related attrs
        ├── Fire page_view event (classified by page type)
        ├── Set up click event delegation (auto-classifies links)
        ├── Listen for 'frfam:signup' custom event
        └── Listen for 'frfam:team_submit' custom event

User clicks a rider profile link (/riders/reining/andrea-fappani)
  └── analytics.js detects href pattern
        └── Fires rider_profile_click { rider_slug, discipline }

User submits email signup form
  └── email-capture.js dispatches 'frfam:signup' custom event
        └── analytics.js catches it, fires email_signup_submit { variant, source }
```

### Provider adapter pattern

```javascript
CONFIG.provider = 'plausible';  // ← set this

// analytics.js internally calls:
sendToProvider(event_name, payload)
  └── switch(CONFIG.provider) {
        case 'ga4':       sendGA4(event_name, payload);
        case 'plausible': sendPlausible(event_name, payload);
        case 'posthog':   sendPostHog(event_name, payload);
        case 'vercel':    sendVercel(event_name, payload);
      }
```

---

## 3. Event Naming Conventions

All events use `snake_case`. Format: `{context}_{action}`.

| Prefix | Context |
|--------|---------|
| `rider_` | Rider profile interactions |
| `discipline_` | Discipline page interactions |
| `article_` | Editorial content |
| `leaderboard_` | Leaderboard engagement |
| `fantasy_` | Fantasy game interactions |
| `email_` | Email capture |
| `nav_` | Navigation |
| `section_` | Section visibility (IntersectionObserver) |
| `team_` | Fantasy team builder |

**Canonical names** live in `EVENTS` constant in `/engine/analytics.js` and are documented in `/data/tracking-events.json`. Never hardcode event name strings — always use `FRFAM.EVENTS.EVENT_NAME` when adding new tracking.

---

## 4. Page Type Taxonomy

Every page has a `data-page-type` attribute on its `<body>` tag. The analytics engine reads this to fire the correct named page view event automatically.

| data-page-type | Page | Fires |
|----------------|------|-------|
| `homepage` | `/` | `homepage_view` |
| `rider_profile` | `/riders/{disc}/{slug}` | `rider_profile_view` |
| `riders_hub` | `/riders` | `page_view` |
| `riders_discipline` | `/riders/{disc}` | `page_view` |
| `discipline_page` | `/disciplines/{disc}` | `discipline_page_view` |
| `leaderboard` | `/leaderboard` | `leaderboard_view` |
| `fantasy_team_builder` | `/pick-your-team` | `fantasy_team_builder_view` |
| `scoring_rules` | `/scoring-rules` | `scoring_rules_view` |
| `article` | `/news/{slug}` | `article_view` |
| `news_hub` | `/news`, `/news/{disc}` | `news_hub_view` |
| `events_page` | `/events`, `/events/{slug}` | `events_page_view` |
| `top_riders` | `/top-riders` | `top_riders_view` |
| `faq` | `/faq` | `faq_view` |
| `signup` | `/signup` | `signup_page_view` |
| `how_it_works` | `/how-it-works` | `how_it_works_view` |
| `about` | `/about` | `page_view` |
| `contact` | `/contact` | `page_view` |

### Rider profile supplementary attributes

```html
<body
  data-page-type="rider_profile"
  data-rider-slug="andrea-fappani"
  data-rider-discipline="reining"
>
```

### Article supplementary attributes

```html
<body
  data-page-type="article"
  data-article-slug="understanding-reining-maneuver-scores"
  data-article-category="reining"
>
```

---

## 5. Enabling a Provider

**Step 1:** Choose your provider (Plausible recommended for privacy-first, GA4 for ecosystem).

**Step 2:** Edit `/engine/analytics.js`:
```javascript
var CONFIG = {
  provider: 'plausible',  // ← change from null
  debug:    false,         // ← set false in production
  plausible: {
    domain: 'fantasyrunforamillion.com',  // ← set domain
  },
};
```

**Step 3:** Add the provider's loading script to all pages. Use the production pass script to inject into `<head>` across all pages.

**Step 4:** Deploy and verify events appear in the provider dashboard.

---

## 6. Provider Setup Guides

### Plausible (Recommended)
Privacy-first, no cookies, GDPR/CCPA compliant without a consent banner.

```html
<!-- Add to <head> on all pages -->
<script defer data-domain="fantasyrunforamillion.com"
  src="https://plausible.io/js/script.tagged-events.js"></script>
```

```javascript
// analytics.js CONFIG:
provider: 'plausible',
plausible: { domain: 'fantasyrunforamillion.com' },
```

Cost: Free up to 10k pageviews/month, $9/month above that.

### Google Analytics 4
Full ecosystem integration, audience building, Google Ads integration.

```html
<!-- Add to <head> on all pages (before analytics.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date()); gtag('config', 'G-XXXXXXXXXX');
</script>
```

```javascript
// analytics.js CONFIG:
provider: 'ga4',
ga4: { measurement_id: 'G-XXXXXXXXXX' },
```

Note: GA4 requires cookie consent banner in EU/UK.

### PostHog
Full product analytics + session recording + feature flags.

```html
<!-- Add to <head> on all pages (before analytics.js) -->
<script>
  !function(t,e){/* PostHog init snippet */}(window);
  posthog.init('phc_XXXXXXXX', {api_host: 'https://app.posthog.com', autocapture: false});
</script>
```

```javascript
// analytics.js CONFIG:
provider: 'posthog',
posthog: { api_key: 'phc_XXXXXXXX', api_host: 'https://app.posthog.com' },
```

Set `autocapture: false` to prevent PostHog from capturing all clicks automatically — analytics.js handles click tracking intentionally.

### Vercel Analytics
Zero-config on Vercel deployments. Auto-detects from deployment environment.

```javascript
// analytics.js CONFIG:
provider: 'vercel',
// No additional config needed on Vercel deployments
```

---

## 7. Key Events Reference

### Page views (auto-fired)

| Event | When | Key Properties |
|-------|------|----------------|
| `homepage_view` | Homepage loads | `url` |
| `rider_profile_view` | Any rider profile loads | `rider_slug`, `rider_discipline` |
| `discipline_page_view` | /disciplines/* loads | `discipline` |
| `leaderboard_view` | Leaderboard loads | `url` |
| `fantasy_team_builder_view` | Pick-your-team loads | `url` |
| `article_view` | Any article loads | `article_slug`, `article_category` |
| `scoring_rules_view` | Scoring rules loads | `url` |
| `signup_page_view` | /signup loads | `url` |

### Engagement (auto-fired on link click)

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `rider_profile_click` | Click to /riders/{disc}/{slug} | `rider_slug`, `discipline` |
| `article_click` | Click to /news/{slug} | `article_slug` |
| `fantasy_team_builder_click` | Click to /pick-your-team | `source_page_type` |
| `leaderboard_click` | Click to /leaderboard | `source_page_type` |
| `signup_cta_click` | Click to /signup | `source_page_type` |
| `discipline_click` | Click to /disciplines/* | `discipline` |

### Conversions

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `email_signup_submit` | Signup form submitted | `variant`, `source` |
| `team_submission_attempt` | Team submit button clicked | `has_reining`, `has_cow_horse`, `has_cutting`, `is_complete` |

---

## 8. Sponsor & Reporting Readiness

Once a provider is connected, the following reports are immediately available:

### Rider Popularity Report
**Signal:** `rider_profile_view` grouped by `rider_slug`  
**Breakout:** by `rider_discipline`, by date range  
**Use:** Identify which riders drive the most interest; inform sponsor conversations about rider-level audience.

### Discipline Engagement Report
**Signal:** `discipline_page_view` + `rider_profile_view` + `article_view` by discipline tag  
**Use:** Show relative engagement between reining, cow horse, and cutting; inform content investment decisions.

### Fantasy Funnel Report
**Conversion path:**
```
homepage_view
  → how_it_works_view
    → scoring_rules_view
      → fantasy_team_builder_view
        → team_submission_attempt (is_complete: true)
```
**Use:** Measure drop-off at each funnel step; prioritize UX improvements.

### Content Performance Report
**Signal:** `article_view` grouped by `article_slug`, `article_category`  
**Use:** Identify highest-performing articles; inform editorial priorities.

### Email Growth Report
**Signal:** `email_signup_submit` grouped by `variant` and `source`  
**Use:** Identify which page variants and locations drive the most signups.

---

## 9. Privacy Considerations

**Current state (debug mode):** Zero data transmitted. Zero cookies set. No user tracking of any kind.

**When a provider is connected:**

| Provider | Cookies | IP Storage | Consent Required (EU) |
|----------|---------|------------|----------------------|
| Plausible | ❌ None | ❌ Anonymized | ❌ No |
| GA4 | ✅ Yes | ✅ Yes | ✅ Yes (consent banner) |
| PostHog | Configurable | Configurable | Depends on config |
| Vercel | ❌ None | ❌ Anonymized | ❌ No |

**Recommendation:** Start with Plausible. No consent banner required, GDPR/CCPA compliant by default, and provides all the signals needed for rider popularity, content performance, and funnel measurement.

**Never track:**
- Email addresses in event properties (the signup event only logs `variant` and `source`)
- Personally identifiable information of any kind
- Specific user behavior across sessions (avoid session recording until legally reviewed)

---

## 10. Development Testing

### Verify analytics in browser console

1. Open any page on the site
2. Open browser DevTools → Console
3. Look for `[FRFAM Analytics]` styled log groups
4. Expand a group to see the full event payload

### Test a specific event
```javascript
// In browser console:
FRFAM.Analytics.test('rider_profile_view')
// → Fires test event with current page context

// Fire a custom event:
FRFAM.track('rider_profile_click', { rider_slug: 'test', discipline: 'reining' })
```

### List all available events
```javascript
FRFAM.Analytics.listEvents()
// → Logs all canonical event names to console
```

### Check current config
```javascript
FRFAM.Analytics.CONFIG
// → Shows current provider, debug status, credentials (null until set)
```

### Simulate email signup
```javascript
document.dispatchEvent(new CustomEvent('frfam:signup', { detail: { variant: 'waitlist' } }))
// → Should log email_signup_submit event
```

---

*Maintained by Bridle & Bit Media / aiagent322*
