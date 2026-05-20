/**
 * Fantasy Run For A Million — Analytics Engine
 * =============================================
 * Lightweight event tracking utility for rider interest,
 * fantasy engagement, and content performance measurement.
 *
 * CURRENT STATE: Debug mode — events log to console only.
 *   Zero external network requests. Zero cookies.
 *
 * TO ENABLE A PROVIDER: Set CONFIG.provider and add credentials.
 *   All provider adapters are production-ready — just needs keys.
 *
 * Supported providers:
 *   GA4       — Google Analytics 4 (gtag.js must also be loaded)
 *   Plausible — Privacy-first, no cookies (recommended)
 *   PostHog   — Product analytics + session recording
 *   Vercel    — Zero-config if deployed on Vercel
 *
 * Event taxonomy documented in: /data/tracking-events.json
 * Full setup guide in:           /platform/ANALYTICS_DOCS.md
 *
 * @version 1.0.0
 * @status  debug
 * @size    ~7KB
 */

(function () {
  'use strict';

  /* ── Configuration ────────────────────────────────────────────────────────
     Set provider to one of: 'ga4' | 'plausible' | 'posthog' | 'vercel' | null
     null = debug mode (console only, no network requests)
  ────────────────────────────────────────────────────────────────────────── */
  var CONFIG = {
    provider: 'plausible',  // ACTIVATED — Plausible selected as first analytics provider
    debug:    true,         // Keep true until events verified in Plausible dashboard, then set false

    ga4: {
      measurement_id: null,   // Reserved for future sponsor reporting — not active
    },

    plausible: {
      domain: 'fantasyrunforamillion.com',
      // Script tag: <script defer data-domain="fantasyrunforamillion.com"
      //   src="https://plausible.io/js/script.tagged-events.js"></script>
      // tagged-events variant required for custom event tracking
    },

    posthog: {
      api_key:  null,                       // e.g. 'phc_XXXXXXXX'
      api_host: 'https://app.posthog.com',
      // Also initialize PostHog SDK before this script runs
    },

    vercel: {
      // Auto-detected when running on Vercel — no config needed
      // Add @vercel/analytics package or the inline snippet to enable
    },
  };

  /* ── Event taxonomy ───────────────────────────────────────────────────────
     Canonical event names used across all providers.
     Full schema: /data/tracking-events.json
  ────────────────────────────────────────────────────────────────────────── */
  var EVENTS = {
    // Page views
    PAGE_VIEW:               'page_view',
    HOMEPAGE_VIEW:           'homepage_view',
    RIDER_PROFILE_VIEW:      'rider_profile_view',
    DISCIPLINE_PAGE_VIEW:    'discipline_page_view',
    LEADERBOARD_VIEW:        'leaderboard_view',
    TEAM_BUILDER_VIEW:       'fantasy_team_builder_view',
    SCORING_RULES_VIEW:      'scoring_rules_view',
    ARTICLE_VIEW:            'article_view',
    NEWS_HUB_VIEW:           'news_hub_view',
    EVENTS_VIEW:             'events_page_view',
    TOP_RIDERS_VIEW:         'top_riders_view',
    FAQ_VIEW:                'faq_view',
    SIGNUP_PAGE_VIEW:        'signup_page_view',
    HOW_IT_WORKS_VIEW:       'how_it_works_view',
    // Engagement
    RIDER_PROFILE_CLICK:     'rider_profile_click',
    ARTICLE_CLICK:           'article_click',
    TEAM_BUILDER_CLICK:      'fantasy_team_builder_click',
    LEADERBOARD_CLICK:       'leaderboard_click',
    SIGNUP_CTA_CLICK:        'signup_cta_click',
    DISCIPLINE_CLICK:        'discipline_click',
    // Conversions
    EMAIL_SIGNUP_SUBMIT:     'email_signup_submit',
    TEAM_SUBMISSION_ATTEMPT: 'team_submission_attempt',
    // Navigation
    NAV_CTA_CLICK:           'nav_cta_click',
    FOOTER_LINK_CLICK:       'footer_link_click',
  };

  /* ── Page type → event name map ───────────────────────────────────────── */
  var PAGE_EVENT_MAP = {
    homepage:            EVENTS.HOMEPAGE_VIEW,
    rider_profile:       EVENTS.RIDER_PROFILE_VIEW,
    discipline_page:     EVENTS.DISCIPLINE_PAGE_VIEW,
    leaderboard:         EVENTS.LEADERBOARD_VIEW,
    fantasy_team_builder: EVENTS.TEAM_BUILDER_VIEW,
    scoring_rules:       EVENTS.SCORING_RULES_VIEW,
    article:             EVENTS.ARTICLE_VIEW,
    news_hub:            EVENTS.NEWS_HUB_VIEW,
    events_page:         EVENTS.EVENTS_VIEW,
    top_riders:          EVENTS.TOP_RIDERS_VIEW,
    faq:                 EVENTS.FAQ_VIEW,
    signup:              EVENTS.SIGNUP_PAGE_VIEW,
    how_it_works:        EVENTS.HOW_IT_WORKS_VIEW,
  };

  /* ── Link → event classification ─────────────────────────────────────────
     Auto-classifies link clicks based on href pattern.
     No HTML changes needed on existing pages.
  ────────────────────────────────────────────────────────────────────────── */
  var LINK_PATTERNS = [
    { pattern: /^\/riders\/[^/]+\/[^/]+/, event: EVENTS.RIDER_PROFILE_CLICK,
      props: function(href) {
        var parts = href.split('/').filter(Boolean);
        return { rider_slug: parts[2] || '', discipline: parts[1] || '' };
      }
    },
    { pattern: /^\/news\/[a-z][a-z0-9-]{10,}/, event: EVENTS.ARTICLE_CLICK,
      props: function(href) { return { article_slug: href.split('/news/')[1] || '' }; }
    },
    { pattern: /^\/pick-your-team/, event: EVENTS.TEAM_BUILDER_CLICK, props: function() { return {}; } },
    { pattern: /^\/leaderboard/,    event: EVENTS.LEADERBOARD_CLICK,  props: function() { return {}; } },
    { pattern: /^\/signup/,          event: EVENTS.SIGNUP_CTA_CLICK,   props: function() { return {}; } },
    { pattern: /^\/disciplines\//,  event: EVENTS.DISCIPLINE_CLICK,
      props: function(href) { return { discipline: href.split('/disciplines/')[1] || '' }; }
    },
  ];

  /* ── Page metadata from <body> data attributes ────────────────────────── */
  function getPageMeta() {
    var b = document.body;
    return {
      page_type:        b.getAttribute('data-page-type')         || 'unknown',
      discipline:       b.getAttribute('data-discipline')         || undefined,
      rider_slug:       b.getAttribute('data-rider-slug')         || undefined,
      rider_discipline: b.getAttribute('data-rider-discipline')   || undefined,
      article_slug:     b.getAttribute('data-article-slug')       || undefined,
      article_category: b.getAttribute('data-article-category')   || undefined,
      event_slug:       b.getAttribute('data-event-slug')         || undefined,
      url:              window.location.pathname,
    };
  }

  /* ── Strip undefined values from payload ─────────────────────────────── */
  function clean(obj) {
    var out = {};
    Object.keys(obj).forEach(function(k) {
      if (obj[k] !== undefined && obj[k] !== null) out[k] = obj[k];
    });
    return out;
  }

  /* ── Core track function ──────────────────────────────────────────────── */
  function track(event_name, properties) {
    var meta    = getPageMeta();
    var payload = clean(Object.assign({}, meta, properties));

    if (CONFIG.debug) {
      var style = 'color:#C9A84C;font-weight:bold';
      console.groupCollapsed('%c[FRFAM Analytics] ' + event_name, style);
      console.table(payload);
      console.log('Provider:', CONFIG.provider || 'none (debug mode)');
      console.groupEnd();
    }

    if (CONFIG.provider) {
      sendToProvider(event_name, payload);
    }
  }

  /* ── Provider adapters ────────────────────────────────────────────────── */

  function sendToProvider(event_name, payload) {
    switch (CONFIG.provider) {
      case 'ga4':      sendGA4(event_name, payload);       break;
      case 'plausible': sendPlausible(event_name, payload); break;
      case 'posthog':  sendPostHog(event_name, payload);   break;
      case 'vercel':   sendVercel(event_name, payload);    break;
      default:
        if (CONFIG.debug) console.warn('[FRFAM Analytics] Unknown provider:', CONFIG.provider);
    }
  }

  /**
   * Google Analytics 4
   * Requires gtag.js loaded before this script.
   * Setup: Add GA4 snippet to <head>, set CONFIG.ga4.measurement_id
   */
  function sendGA4(event_name, payload) {
    if (typeof window.gtag !== 'function') {
      CONFIG.debug && console.warn('[FRFAM] gtag not loaded — add GA4 snippet to <head>');
      return;
    }
    // GA4 reserved params: page_title, page_location stripped from custom events
    var ga_params = Object.assign({}, payload);
    delete ga_params.url;
    window.gtag('event', event_name, ga_params);
  }

  /**
   * Plausible Analytics
   * Privacy-first, no cookies, GDPR-friendly.
   * Setup: Add Plausible script to <head>, set CONFIG.plausible.domain
   *
   * Plausible custom events require the 'tagged-events' script variant:
   * <script defer data-domain="..." src="https://plausible.io/js/script.tagged-events.js"></script>
   */
  function sendPlausible(event_name, payload) {
    if (typeof window.plausible !== 'function') {
      CONFIG.debug && console.warn('[FRFAM] plausible() not loaded — add Plausible script to <head>');
      return;
    }
    // Plausible custom events accept a props object
    window.plausible(event_name, { props: payload });
  }

  /**
   * PostHog
   * Full product analytics with session recording.
   * Setup: Initialize PostHog SDK before this script, set CONFIG.posthog.api_key
   *
   * posthog.init(CONFIG.posthog.api_key, { api_host: CONFIG.posthog.api_host });
   */
  function sendPostHog(event_name, payload) {
    if (typeof window.posthog === 'undefined' || !window.posthog.capture) {
      CONFIG.debug && console.warn('[FRFAM] PostHog not initialized — init() before this script');
      return;
    }
    window.posthog.capture(event_name, payload);
  }

  /**
   * Vercel Analytics
   * Zero-config on Vercel deployments. Works with @vercel/analytics package
   * or the inline script snippet.
   */
  function sendVercel(event_name, payload) {
    if (typeof window.va === 'function') {
      window.va('event', { name: event_name, data: payload });
    } else if (typeof window.vercel === 'object' && window.vercel.track) {
      window.vercel.track(event_name, payload);
    } else {
      CONFIG.debug && console.warn('[FRFAM] Vercel Analytics not detected');
    }
  }

  /* ── Auto page view ───────────────────────────────────────────────────── */
  function trackPageView() {
    var meta       = getPageMeta();
    var event_name = PAGE_EVENT_MAP[meta.page_type] || EVENTS.PAGE_VIEW;
    track(event_name, {});
  }

  /* ── Auto link click tracking ─────────────────────────────────────────── */
  function initLinkTracking() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('a[href]');
      if (!el) return;
      var href = el.getAttribute('href') || '';

      // Skip external, hash, and javascript links
      if (!href.startsWith('/') || href.startsWith('//')) return;

      // Explicit data-track-event override takes priority
      if (el.hasAttribute('data-track-event')) {
        var explicit_event = el.getAttribute('data-track-event');
        var explicit_props = {};
        Array.prototype.forEach.call(el.attributes, function (attr) {
          if (attr.name.startsWith('data-track-') && attr.name !== 'data-track-event') {
            var key = attr.name.slice('data-track-'.length).replace(/-/g, '_');
            explicit_props[key] = attr.value;
          }
        });
        track(explicit_event, explicit_props);
        return;
      }

      // Auto-classify by href pattern
      for (var i = 0; i < LINK_PATTERNS.length; i++) {
        var rule = LINK_PATTERNS[i];
        if (rule.pattern.test(href)) {
          track(rule.event, rule.props(href));
          return;
        }
      }

      // Nav CTA ("Enter Now", "Pick Your Team") detection
      var text = (el.textContent || '').trim().toLowerCase();
      if (text.indexOf('enter') !== -1 || text.indexOf('pick your team') !== -1) {
        track(EVENTS.NAV_CTA_CLICK, { label: el.textContent.trim(), href: href });
      }
    });
  }

  /* ── Email capture integration ────────────────────────────────────────── */
  // Listens for the custom 'frfam:signup' event dispatched by email-capture.js
  function initSignupTracking() {
    document.addEventListener('frfam:signup', function (e) {
      var detail = e.detail || {};
      track(EVENTS.EMAIL_SIGNUP_SUBMIT, {
        variant: detail.variant || 'unknown',
        source:  getPageMeta().page_type,
      });
    });
  }

  /* ── Team builder tracking ────────────────────────────────────────────── */
  // Listens for team submission attempts from pick-your-team page
  function initTeamTracking() {
    document.addEventListener('frfam:team_submit', function (e) {
      var detail = e.detail || {};
      track(EVENTS.TEAM_SUBMISSION_ATTEMPT, {
        has_reining:   detail.has_reining   || false,
        has_cow_horse: detail.has_cow_horse || false,
        has_cutting:   detail.has_cutting   || false,
        is_complete:   detail.is_complete   || false,
      });
    });
  }

  /* ── Visibility tracking for key sections ─────────────────────────────── */
  // Uses IntersectionObserver to track when key sections enter viewport.
  // Useful for measuring scroll depth and section engagement.
  function initSectionTracking() {
    if (!window.IntersectionObserver) return;

    var observed = document.querySelectorAll('[data-track-section]');
    if (!observed.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var section = entry.target.getAttribute('data-track-section');
          track('section_view', { section: section });
          observer.unobserve(entry.target);  // fire once per session
        }
      });
    }, { threshold: 0.4 });

    observed.forEach(function (el) { observer.observe(el); });
  }

  /* ── Expose debug utilities ───────────────────────────────────────────── */
  function listEvents() {
    console.log('[FRFAM Analytics] Available events:');
    Object.keys(EVENTS).forEach(function(k) { console.log(' ', EVENTS[k]); });
  }

  /* ── Initialize ───────────────────────────────────────────────────────── */
  function init() {
    initLinkTracking();
    initSignupTracking();
    initTeamTracking();
    trackPageView();
    // initSectionTracking(); // Uncomment when data-track-section attrs are added
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Public API ───────────────────────────────────────────────────────── */
  window.FRFAM = window.FRFAM || {};
  window.FRFAM.track      = track;
  window.FRFAM.EVENTS     = EVENTS;
  window.FRFAM.Analytics  = {
    version:    '1.0.0',
    status:     'debug',
    provider:   CONFIG.provider,
    CONFIG:     CONFIG,
    listEvents: listEvents,
    // Debug helper: FRFAM.Analytics.test('rider_profile_view')
    test: function(event_name) { track(event_name, { _test: true }); },
  };

})();
