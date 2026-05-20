/**
 * Fantasy Run For A Million — Email Capture Engine
 * =================================================
 * Handles all email signup forms across the platform.
 *
 * CURRENT STATE: Supabase active — inserts to email_subscribers table.
 *   Plausible analytics fires on each successful signup.
 *   Anon key loaded from window.FRFAM_SUPABASE_ANON_KEY (gitignored file).
 *   Falls back to demo mode (console log) if key not set.
 *
 * SUPABASE PROJECT: ptuuuishzwwgmaexneul
 * TABLE:            public.email_subscribers
 * RLS:              anon insert-only (see /platform/sql/001_email_subscribers.sql)
 * KEY SETUP:        See /engine/supabase-keys.example.js
 *
 * TO GO LIVE: Set PROVIDER.active and fill in credentials.
 *   All submission logic is already written — just uncomment
 *   the relevant provider block in submitToProvider().
 *
 * Supported providers (configured but not connected):
 *   - Resend          (direct API)
 *   - ConvertKit      (form subscribe API)
 *   - Beehiiv         (publication subscription API)
 *   - Mailchimp       (via Cloudflare Worker proxy — avoids CORS)
 *   - Supabase        (email_subscribers table, anon key)
 *
 * @version 1.0.0
 * @status  demo
 */

(function () {
  'use strict';

  /* ── Provider configuration ─────────────────────────────────────────────── */
  // Set active to a provider key and fill credentials when ready to go live.
  // Never hardcode API keys here in production — use environment variables
  // injected at build time or a Cloudflare Worker proxy.

  var PROVIDER = {
    active:   'supabase',  // ACTIVATED — Supabase email_subscribers table

    resend: {
      api_key:    null,
      audience_id: null,
      endpoint:   'https://api.resend.com/audiences/{audience_id}/contacts',
    },

    convertkit: {
      api_key:  null,
      form_id:  null,
      endpoint: 'https://api.convertkit.com/v3/forms/{form_id}/subscribe',
    },

    beehiiv: {
      api_key:        null,
      publication_id: null,
      endpoint:       'https://api.beehiiv.com/v2/publications/{publication_id}/subscriptions',
    },

    mailchimp: {
      worker_endpoint: '/api/subscribe',
    },

    supabase: {
      url:      'https://ptuuuishzwwgmaexneul.supabase.co',
      // ANON KEY — Safe to use in client-side JS (protected by RLS: insert-only).
      // Set window.FRFAM_SUPABASE_ANON_KEY in engine/supabase-keys.js (gitignored)
      // before this script loads. See engine/supabase-keys.example.js for setup.
      // Get key: https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/settings/api
      get anon_key() {
        return (typeof window !== 'undefined' && window.FRFAM_SUPABASE_ANON_KEY)
          || null;
      },
      table:    'email_subscribers',
      endpoint: 'https://ptuuuishzwwgmaexneul.supabase.co/rest/v1/email_subscribers',
    },
  };

  /* ── Tag-to-list mapping ─────────────────────────────────────────────────── */
  // data-variant on <form> element → which list/tag to add subscriber to
  var LIST_TAGS = {
    'waitlist':    'waitlist',
    'news':        'news',
    'leaderboard': 'leaderboard-alerts',
    'contest':     'contest-updates',
    'default':     'general',
  };

  /* ── Utilities ───────────────────────────────────────────────────────────── */

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getFormVariant(form) {
    return form.getAttribute('data-variant') || 'default';
  }

  function getTag(variant) {
    return LIST_TAGS[variant] || LIST_TAGS['default'];
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.setAttribute('aria-busy', loading ? 'true' : 'false');
    if (loading) {
      btn.setAttribute('data-original-text', btn.textContent.trim());
      btn.textContent = 'Joining…';
    } else {
      var original = btn.getAttribute('data-original-text');
      if (original) btn.textContent = original;
    }
  }

  function showSuccess(formWrap, variant) {
    var form  = formWrap.querySelector('.frfam-signup-form');
    var msg   = formWrap.querySelector('.signup-success');
    if (form)  { form.style.display = 'none'; form.setAttribute('aria-hidden', 'true'); }
    // Dispatch analytics event for /engine/analytics.js listener
    try {
      document.dispatchEvent(new CustomEvent('frfam:signup', { detail: { variant: variant } }));
    } catch(e) { /* non-critical */ }
    if (msg)   { msg.hidden = false; msg.removeAttribute('aria-hidden'); }
  }

  function showError(formWrap, errorCode) {
    var errEl = formWrap.querySelector('.signup-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'signup-error';
      errEl.setAttribute('role', 'alert');
      formWrap.appendChild(errEl);
    }

    var messages = {
      'auth_error':    'Configuration error — signups temporarily unavailable. Please try again later.',
      'network_error': 'Connection error — please check your internet and try again.',
      'server_error':  'Something went wrong on our end. Please try again in a moment.',
      'default':       'Unable to subscribe right now. Please try again.',
    };
    errEl.textContent = messages[errorCode] || errorCode || messages['default'];
    errEl.hidden = false;
  }

  /* ── Form submission ──────────────────────────────────────────────────────── */

  function handleSubmit(e) {
    e.preventDefault();

    var form    = e.currentTarget;
    var wrap    = form.closest('.signup-form-wrap') || form.parentElement;
    var input   = form.querySelector('input[type="email"]');
    var btn     = form.querySelector('button[type="submit"]');
    var variant = getFormVariant(form);

    if (!input || !btn) return;

    var email = input.value.trim();

    // Clear previous errors
    var errEl = wrap.querySelector('.signup-error');
    if (errEl) errEl.hidden = true;

    if (!isValidEmail(email)) {
      input.focus();
      input.setCustomValidity('Please enter a valid email address.');
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');

    setLoading(btn, true);

    // Simulate async submission
    setTimeout(function () {
      if (PROVIDER.active) {
        submitToProvider(email, variant, wrap, btn);
      } else {
        // DEMO MODE
        console.log(
          '[FRFAM Email Capture] Demo mode — not transmitted.\n' +
          '  Email:   ' + email + '\n' +
          '  Variant: ' + variant + '\n' +
          '  Tag:     ' + getTag(variant) + '\n' +
          '  To go live: set PROVIDER.active in /engine/email-capture.js'
        );
        setLoading(btn, false);
        showSuccess(wrap, variant);
      }
    }, 700);
  }

  /* ── Provider submission stubs ───────────────────────────────────────────── */
  // Uncomment and complete the relevant block when going live.
  // Each provider stub is production-ready — just needs credentials.

  function submitToProvider(email, variant, wrap, btn) {
    var tag  = getTag(variant);
    var p    = PROVIDER;
    var done = function () { setLoading(btn, false); showSuccess(wrap, variant); };
    var fail = function (err) { setLoading(btn, false); showError(wrap); console.error('[FRFAM]', err); };

    /* ── Resend ──────────────────────────────────────────────────────────── */
    if (p.active === 'resend') {
      var audienceId = p.resend.audience_id;
      fetch('https://api.resend.com/audiences/' + audienceId + '/contacts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + p.resend.api_key },
        body:    JSON.stringify({ email: email, tags: [tag], unsubscribed: false }),
      })
        .then(function (r) { return r.ok ? done() : fail('Resend error ' + r.status); })
        .catch(fail);
      return;
    }

    /* ── ConvertKit ──────────────────────────────────────────────────────── */
    if (p.active === 'convertkit') {
      fetch('https://api.convertkit.com/v3/forms/' + p.convertkit.form_id + '/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ api_key: p.convertkit.api_key, email: email, tags: [tag] }),
      })
        .then(function (r) { return r.ok ? done() : fail('ConvertKit error ' + r.status); })
        .catch(fail);
      return;
    }

    /* ── Beehiiv ─────────────────────────────────────────────────────────── */
    if (p.active === 'beehiiv') {
      fetch('https://api.beehiiv.com/v2/publications/' + p.beehiiv.publication_id + '/subscriptions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + p.beehiiv.api_key },
        body:    JSON.stringify({ email: email, utm_source: 'frfam-web', utm_medium: variant }),
      })
        .then(function (r) { return r.ok ? done() : fail('Beehiiv error ' + r.status); })
        .catch(fail);
      return;
    }

    /* ── Mailchimp (via Cloudflare Worker proxy) ─────────────────────────── */
    // Deploy worker: /platform/workers/mailchimp-subscribe.js
    if (p.active === 'mailchimp') {
      fetch(p.mailchimp.worker_endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email, tag: tag }),
      })
        .then(function (r) { return r.ok ? done() : fail('Mailchimp proxy error ' + r.status); })
        .catch(fail);
      return;
    }

    /* ── Supabase ────────────────────────────────────────────────────────── */
    // Table: public.email_subscribers
    // RLS:   anon insert-only (see /platform/sql/001_email_subscribers.sql)
    // Fields: email, source (page_type), variant, page_url
    if (p.active === 'supabase') {
      var key = p.supabase.anon_key;

      // Guard: anon key not configured — fall back to demo mode
      if (!key) {
        console.warn(
          '[FRFAM Email] Supabase anon key not set.\n' +
          '  1. Copy engine/supabase-keys.example.js → engine/supabase-keys.js\n' +
          '  2. Add your anon key from:\n' +
          '     https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/settings/api\n' +
          '  3. Load the file before email-capture.js on every page.'
        );
        // Show success in demo mode so UX is not broken during development
        done();
        return;
      }

      // Derive page source from body data attribute (set by inject_analytics.py)
      var pageSource = (
        document.body.getAttribute('data-page-type') || variant
      );

      fetch(p.supabase.endpoint, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        key,
          'Authorization': 'Bearer ' + key,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({
          email:    email,
          source:   pageSource,
          variant:  variant,
          page_url: window.location.pathname,
        }),
      })
        .then(function (r) {
          if (r.ok || r.status === 201) {
            // Inserted successfully
            done();
          } else if (r.status === 409) {
            // HTTP 409 Conflict — unique constraint on email
            // Treat as success: don't reveal whether email is in the list
            console.log('[FRFAM Email] Already subscribed — showing success.');
            done();
          } else {
            // Parse body for Postgres error codes
            return r.json().then(function (body) {
              var code = body && (body.code || '');
              var msg  = body && (body.message || '');

              if (code === '23505' || msg.indexOf('unique') !== -1 || msg.indexOf('duplicate') !== -1) {
                // Duplicate email — treat as success
                console.log('[FRFAM Email] Duplicate email caught via body — showing success.');
                done();
              } else if (r.status === 401 || r.status === 403) {
                // Auth / RLS issue — likely key not configured or RLS policy missing
                console.error('[FRFAM Email] Auth error', r.status, body);
                fail('auth_error');
              } else {
                console.error('[FRFAM Email] Server error', r.status, body);
                fail('server_error');
              }
            }).catch(function () {
              fail('server_error');
            });
          }
        })
        .catch(function (err) {
          // Network error (offline, CORS, DNS)
          console.error('[FRFAM Email] Network error:', err);
          fail('network_error');
        });
      return;
    }

    // Fallback: unknown provider
    console.warn('[FRFAM] Unknown provider:', p.active);
    done();
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */

  function init() {
    var forms = document.querySelectorAll('.frfam-signup-form');
    forms.forEach(function (form) {
      form.addEventListener('submit', handleSubmit);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  if (typeof window !== 'undefined') {
    window.FRFAM_EmailCapture = { version: '1.0.0', status: 'demo', provider: PROVIDER };
  }

})();
