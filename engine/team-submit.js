/**
 * Fantasy Run For A Million — Team Submission Engine
 * ===================================================
 * Handles fantasy team submission to Supabase.
 *
 * FLOW:
 *   1. Validate: team_name, email, complete 7-rider roster
 *   2. POST /fantasy_teams    → get team UUID
 *   3. POST /fantasy_team_riders → insert all 7 riders in one batch
 *   4. Dispatch frfam:team_submit CustomEvent (analytics.js listens)
 *   5. Show success or friendly error state
 *
 * SUPABASE PROJECT: ptuuuishzwwgmaexneul
 * TABLES: public.fantasy_teams, public.fantasy_team_riders
 * RLS: anon insert-only (see /platform/sql/002_fantasy_teams.sql)
 *
 * ANON KEY: Set window.FRFAM_SUPABASE_ANON_KEY before this script loads.
 *   Copy engine/supabase-keys.example.js → engine/supabase-keys.js (gitignored).
 *
 * FUTURE AUTH INTEGRATION:
 *   When user accounts are added, pass the user JWT as the Authorization header
 *   instead of the anon key. Add auth_user_id to the fantasy_teams INSERT body.
 *   All other logic remains unchanged.
 *
 * @version 1.0.0
 */

(function () {
  'use strict';

  var SUPABASE_URL = 'https://ptuuuishzwwgmaexneul.supabase.co';
  var REST         = SUPABASE_URL + '/rest/v1';

  /* ── Validation ─────────────────────────────────────────────────────────── */

  var ERRORS = {
    missing_name:     'Please enter a team name.',
    missing_email:    'Please enter a valid email address.',
    invalid_email:    'Please enter a valid email address.',
    incomplete_roster:'Your roster isn\'t complete yet — select all 7 riders first.',
    duplicate:        'This email already has a team entered. Only one entry per email.',
    auth:             'Submission temporarily unavailable — please try again later.',
    network:          'Connection error — please check your internet and try again.',
    server:           'Something went wrong on our end. Please try again in a moment.',
    no_key:           'Submission is not yet open. Check back soon.',
  };

  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function isRosterComplete(state) {
    if (!state) return false;
    return (
      (state.reining  || new Set()).size  >= 2 &&
      (state.cowhorse || new Set()).size  >= 2 &&
      (state.cutting  || new Set()).size  >= 2 &&
      (state.bonus    || new Set()).size  >= 1
    );
  }

  /* ── Name → slug ─────────────────────────────────────────────────────────── */
  // Converts display name to URL slug matching rider profile paths.
  // "Andrea Fappani" → "andrea-fappani"

  function nameToSlug(name) {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/[''`]/g, '')          // remove apostrophes
      .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric
      .replace(/\s+/g, '-')           // spaces → hyphens
      .replace(/-{2,}/g, '-');        // collapse double hyphens
  }

  /* ── Build riders array from selected state ──────────────────────────────── */

  function buildRiders(state) {
    var riders = [];

    // Discipline slots: reining, cowhorse, cutting
    ['reining', 'cowhorse', 'cutting'].forEach(function (disc) {
      var dbDisc = disc === 'cowhorse' ? 'cow-horse' : disc;
      (state[disc] || new Set()).forEach(function (name) {
        riders.push({
          rider_slug: nameToSlug(name),
          discipline: dbDisc,
          slot_type:  'discipline',
        });
      });
    });

    // Bonus slot — keys are "disc::name"
    (state.bonus || new Set()).forEach(function (key) {
      var parts  = key.split('::');
      var disc   = parts[0] === 'cowhorse' ? 'cow-horse' : (parts[0] || 'unknown');
      var name   = parts[1] || '';
      riders.push({
        rider_slug: nameToSlug(name),
        discipline: disc,
        slot_type:  'bonus',
      });
    });

    return riders;
  }

  /* ── Supabase fetch helper ───────────────────────────────────────────────── */

  function sbFetch(path, method, body, key, prefer) {
    return fetch(REST + path, {
      method:  method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        key,
        'Authorization': 'Bearer ' + key,
        'Prefer':        prefer || 'return=minimal',
      },
      body: JSON.stringify(body),
    });
  }

  /* ── Error classifier ────────────────────────────────────────────────────── */

  function classifyError(status, body) {
    var code = (body && body.code) || '';
    var msg  = (body && body.message) || '';
    if (code === '23505' || msg.indexOf('unique') > -1 || msg.indexOf('duplicate') > -1) {
      return 'duplicate';
    }
    if (status === 409) return 'duplicate';
    if (status === 401 || status === 403) return 'auth';
    return 'server';
  }

  /* ── Core submitTeam function ────────────────────────────────────────────── */

  function submitTeam(params, onSuccess, onError) {
    var key = (typeof window !== 'undefined' && window.FRFAM_SUPABASE_ANON_KEY) || null;

    if (!key) {
      console.warn('[FRFAM Team] Supabase anon key not set. See engine/supabase-keys.example.js');
      onError('no_key');
      return;
    }

    // ── Step 1: Insert fantasy_teams ─────────────────────────────────────────
    sbFetch('/fantasy_teams', 'POST',
      { team_name: params.teamName, email: params.email },
      key, 'return=representation'
    )
    .then(function (r) {
      if (r.ok || r.status === 201) return r.json();
      return r.json().then(function (b) {
        throw { status: r.status, body: b };
      });
    })

    // ── Step 2: Insert fantasy_team_riders (batch) ───────────────────────────
    .then(function (data) {
      var team   = Array.isArray(data) ? data[0] : data;
      var teamId = team && team.id;
      if (!teamId) throw { status: 0, body: { message: 'No team ID returned from Supabase' } };

      var riders = params.riders.map(function (r) {
        return { fantasy_team_id: teamId, rider_slug: r.rider_slug,
                 discipline: r.discipline, slot_type: r.slot_type };
      });

      return sbFetch('/fantasy_team_riders', 'POST', riders, key, 'return=minimal');
    })

    // ── Step 3: Success ──────────────────────────────────────────────────────
    .then(function (r) {
      if (r.ok || r.status === 201) {
        onSuccess();
      } else {
        return r.json().then(function (b) {
          throw { status: r.status, body: b };
        });
      }
    })

    // ── Step 4: Error handling ────────────────────────────────────────────────
    .catch(function (err) {
      if (err && err.name === 'TypeError') {
        // Network error (offline, CORS, DNS)
        console.error('[FRFAM Team] Network error:', err.message);
        onError('network');
        return;
      }
      var status = (err && err.status) || 0;
      var body   = (err && err.body)   || {};
      console.error('[FRFAM Team] Submission error:', status, body);
      onError(classifyError(status, body));
    });
  }

  /* ── UI controller ──────────────────────────────────────────────────────────
     Wires the pick-your-team submit form to the submitTeam function.
     Called once DOM is ready. Reads team state from window.FRFAM_TEAM_STATE.
  ────────────────────────────────────────────────────────────────────────── */

  function initSubmitForm() {
    var btn      = document.getElementById('submitBtn');
    var nameIn   = document.getElementById('teamName');
    var emailIn  = document.getElementById('teamEmail');
    var errEl    = document.getElementById('submitError');
    var form     = document.getElementById('submitForm');
    var success  = document.getElementById('submitSuccess');
    var notice   = document.getElementById('submitNotice');

    if (!btn || !nameIn || !emailIn) return;

    /* Enable/disable submit based on all conditions */
    function checkReady() {
      var state    = window.FRFAM_TEAM_STATE || {};
      var complete = isRosterComplete(state);
      var hasName  = nameIn.value.trim().length >= 2;
      var hasEmail = validEmail(emailIn.value.trim());
      var ready    = complete && hasName && hasEmail;

      btn.disabled = !ready;
      btn.setAttribute('aria-disabled', ready ? 'false' : 'true');

      if (notice) {
        if (!complete) {
          notice.textContent = 'Complete your roster to submit. Free entry — no payment required.';
        } else if (!hasName) {
          notice.textContent = 'Enter a team name to continue.';
        } else if (!hasEmail) {
          notice.textContent = 'Enter a valid email to continue.';
        } else {
          notice.textContent = 'Your team is ready to submit. Free entry — no payment required.';
        }
      }
    }

    function showError(code) {
      if (!errEl) return;
      errEl.textContent = ERRORS[code] || ERRORS['server'];
      errEl.hidden = false;
    }

    function clearError() {
      if (!errEl) return;
      errEl.hidden = true;
      errEl.textContent = '';
    }

    function setLoading(loading) {
      btn.disabled = loading;
      btn.setAttribute('aria-busy', loading ? 'true' : 'false');
      btn.textContent = loading ? 'Submitting…' : 'Submit Your Team';
    }

    /* Input listeners */
    nameIn.addEventListener('input',  checkReady);
    emailIn.addEventListener('input', checkReady);

    /* Hook into pick-your-team refresh cycle so roster changes re-check */
    var _origRefresh = window.FRFAM_REFRESH_HOOK;
    window.FRFAM_REFRESH_HOOK = function () {
      if (_origRefresh) _origRefresh();
      checkReady();
    };

    /* Submit handler */
    btn.addEventListener('click', function () {
      clearError();

      var state    = window.FRFAM_TEAM_STATE || {};
      var teamName = nameIn.value.trim();
      var email    = emailIn.value.trim();

      /* Final validation */
      if (teamName.length < 2) { showError('missing_name');     return; }
      if (!validEmail(email))  { showError('invalid_email');    return; }
      if (!isRosterComplete(state)) { showError('incomplete_roster'); return; }

      var riders = buildRiders(state);
      setLoading(true);

      submitTeam(
        { teamName: teamName, email: email, riders: riders },

        /* onSuccess */
        function () {
          setLoading(false);
          if (form)    { form.hidden    = true;  }
          if (success) { success.hidden = false; }

          /* Analytics */
          var s = state;
          try {
            document.dispatchEvent(new CustomEvent('frfam:team_submit', { detail: {
              has_reining:   (s.reining  || new Set()).size >= 2,
              has_cow_horse: (s.cowhorse || new Set()).size >= 2,
              has_cutting:   (s.cutting  || new Set()).size >= 2,
              has_bonus:     (s.bonus    || new Set()).size >= 1,
              is_complete:   true,
              rider_count:   riders.length,
            }}));
          } catch (e) { /* non-critical */ }
        },

        /* onError */
        function (code) {
          setLoading(false);
          showError(code);
        }
      );
    });

    /* Initial check */
    checkReady();
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSubmitForm);
  } else {
    initSubmitForm();
  }

  /* ── Public API ──────────────────────────────────────────────────────────── */
  window.FRFAM = window.FRFAM || {};
  window.FRFAM.TeamSubmit = {
    version:        '1.0.0',
    submitTeam:     submitTeam,
    buildRiders:    buildRiders,
    nameToSlug:     nameToSlug,
    isRosterComplete: isRosterComplete,
  };

})();
