/**
 * Fantasy Run For A Million — Fantasy Scoring Engine
 * =====================================================
 * Pure JavaScript scoring functions. Zero dependencies.
 * No DOM manipulation. No API calls. No side effects.
 *
 * CURRENT STATE: Placeholder / stub
 * All scoring logic is defined and documented here.
 * To activate: populate rider results from official event data
 * and wire calculateTeamScore() to the leaderboard display.
 *
 * FUTURE INTEGRATION:
 *   1. Load scoring config from /data/scoring-config.json
 *   2. Load event results from Supabase or results API
 *   3. Calculate all team scores server-side or via Cloudflare Worker
 *   4. Write final scores to Supabase leaderboard table
 *   5. Leaderboard page reads from Supabase via anon key (read-only)
 *
 * Supabase project ref: ptuuuishzwwgmaexneul
 *
 * @version 1.0.0
 * @status  placeholder
 */

'use strict';

// ── Scoring configuration ────────────────────────────────────────────────────
// Source of truth: /data/scoring-config.json
// This inline config mirrors that file for standalone use.

const SCORING_CONFIG = {
  version: 'v1',
  placement_points: {
    1: 100, 2: 80, 3: 65, 4: 50, 5: 40,
    6: 25, 7: 25, 8: 25, 9: 25, 10: 25,
    qualified: 10  // any qualified completed run outside top 10
  },
  bonus_events: {
    discipline_winner:  { points: 25, label: 'Discipline Winner Bonus' },
    highest_composite:  { points: 20, label: 'Highest Composite Score' },
    comeback_rider:     { points: 15, label: 'Comeback Rider Bonus' },
    rookie_underdog:    { points: 15, label: 'Rookie/Underdog Bonus' },
    fan_favorite:       { points: 10, label: 'Fan Favorite Bonus' }
  },
  roster_slots: {
    reining:   { count: 2, discipline: 'reining' },
    cow_horse: { count: 2, discipline: 'cow-horse' },
    cutting:   { count: 2, discipline: 'cutting' },
    bonus:     { count: 1, discipline: 'any' }
  }
};


// ── Type definitions (JSDoc) ──────────────────────────────────────────────────

/**
 * @typedef {Object} RiderResult
 * @property {string}  rider_id     - Matches rider id in /data/riders.json
 * @property {string}  discipline   - 'reining' | 'cow-horse' | 'cutting'
 * @property {string}  event_id     - Matches event id in /data/events.json
 * @property {string}  class_name   - e.g. 'Open', 'Composite', 'Reined Work'
 * @property {number|null} place    - Final placing (1-N), or null if DNS/DQ
 * @property {number|null} score    - Official score, or null
 * @property {boolean} qualified    - True if run was qualified/completed
 * @property {boolean} disqualified - True if DQ'd
 * @property {string[]} bonuses_earned - Array of bonus_event keys earned
 */

/**
 * @typedef {Object} FantasyTeam
 * @property {string}   team_id      - Unique team identifier
 * @property {string}   team_name    - Fan-chosen team name
 * @property {string}   entry_id     - Contest entry UUID
 * @property {string[]} reining      - 2 rider ids
 * @property {string[]} cow_horse    - 2 rider ids
 * @property {string[]} cutting      - 2 rider ids
 * @property {string}   bonus_rider  - 1 rider id (any discipline)
 * @property {string}   submitted_at - ISO 8601 timestamp
 */

/**
 * @typedef {Object} TeamScore
 * @property {string}  team_id
 * @property {string}  team_name
 * @property {number}  total_points
 * @property {number}  placement_points
 * @property {number}  bonus_points
 * @property {Object}  breakdown     - Per-rider point breakdown
 * @property {number}  rank          - Leaderboard rank (set after sorting all teams)
 */


// ── Core scoring functions ────────────────────────────────────────────────────

/**
 * Calculate placement points for a single result.
 * Returns 0 for disqualified runs, qualified points for completed runs outside top 10.
 *
 * @param  {RiderResult} result
 * @returns {number} Points earned from this result
 */
function getPlacementPoints(result) {
  if (!result || result.disqualified) return 0;
  if (!result.qualified) return 0;
  if (result.place && result.place >= 1 && result.place <= 10) {
    return SCORING_CONFIG.placement_points[result.place] ?? SCORING_CONFIG.placement_points.qualified;
  }
  return SCORING_CONFIG.placement_points.qualified;
}

/**
 * Calculate bonus points for a single result.
 *
 * @param  {RiderResult} result
 * @returns {number} Bonus points earned
 */
function getBonusPoints(result) {
  if (!result || !result.bonuses_earned?.length) return 0;
  return result.bonuses_earned.reduce((sum, key) => {
    return sum + (SCORING_CONFIG.bonus_events[key]?.points ?? 0);
  }, 0);
}

/**
 * Calculate total points for a single rider result (placement + bonus).
 *
 * @param  {RiderResult} result
 * @returns {{ placement: number, bonus: number, total: number }}
 */
function getRiderPoints(result) {
  const placement = getPlacementPoints(result);
  const bonus     = getBonusPoints(result);
  return { placement, bonus, total: placement + bonus };
}

/**
 * Calculate total fantasy score for a team given an array of rider results.
 *
 * @param  {FantasyTeam}    team    - The fantasy team
 * @param  {RiderResult[]}  results - All available rider results for the event
 * @returns {TeamScore}
 */
function calculateTeamScore(team, results) {
  const allRiderIds = [
    ...(team.reining    || []),
    ...(team.cow_horse  || []),
    ...(team.cutting    || []),
    team.bonus_rider
  ].filter(Boolean);

  // Index results by rider_id for O(1) lookup
  const resultsByRider = {};
  (results || []).forEach(r => {
    if (!resultsByRider[r.rider_id]) resultsByRider[r.rider_id] = [];
    resultsByRider[r.rider_id].push(r);
  });

  const breakdown = {};
  let placementPoints = 0;
  let bonusPoints     = 0;

  allRiderIds.forEach(riderId => {
    const riderResults = resultsByRider[riderId] || [];
    breakdown[riderId] = { results: [], total: 0 };

    riderResults.forEach(result => {
      const pts = getRiderPoints(result);
      breakdown[riderId].results.push({
        class_name:       result.class_name,
        place:            result.place,
        placement_points: pts.placement,
        bonus_points:     pts.bonus,
        total:            pts.total,
        bonuses_earned:   result.bonuses_earned || []
      });
      breakdown[riderId].total += pts.total;
      placementPoints += pts.placement;
      bonusPoints     += pts.bonus;
    });
  });

  return {
    team_id:          team.team_id,
    team_name:        team.team_name,
    total_points:     placementPoints + bonusPoints,
    placement_points: placementPoints,
    bonus_points:     bonusPoints,
    breakdown,
    rank:             null  // Set by rankTeams()
  };
}

/**
 * Calculate and rank all team scores.
 * Returns array sorted by total_points DESC, ties broken by bonus_points DESC.
 *
 * @param  {FantasyTeam[]}  teams
 * @param  {RiderResult[]}  results
 * @returns {TeamScore[]} Sorted and ranked team scores
 */
function rankTeams(teams, results) {
  const scores = teams.map(t => calculateTeamScore(t, results));

  scores.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return b.bonus_points - a.bonus_points;  // Tiebreaker: most bonus points
  });

  scores.forEach((s, i) => { s.rank = i + 1; });
  return scores;
}

/**
 * Validate that a team roster meets the slot requirements.
 *
 * @param  {FantasyTeam} team
 * @param  {Object[]}    riders - From /data/riders.json
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTeamRoster(team, riders) {
  const errors = [];
  const riderMap = Object.fromEntries(riders.map(r => [r.id, r]));

  const check = (ids, discipline, count, slotLabel) => {
    if (!ids || ids.length !== count) {
      errors.push(`${slotLabel}: must have exactly ${count} rider(s), got ${ids?.length ?? 0}`);
      return;
    }
    ids.forEach(id => {
      if (!riderMap[id]) {
        errors.push(`${slotLabel}: rider '${id}' not found in roster`);
      } else if (discipline !== 'any' && riderMap[id].discipline !== discipline) {
        errors.push(`${slotLabel}: rider '${id}' is ${riderMap[id].discipline}, not ${discipline}`);
      } else if (!riderMap[id].fantasy_eligible) {
        errors.push(`${slotLabel}: rider '${id}' is not eligible for fantasy selection`);
      }
    });
  };

  check(team.reining,   'reining',   2, 'Reining slots');
  check(team.cow_horse, 'cow-horse', 2, 'Cow Horse slots');
  check(team.cutting,   'cutting',   2, 'Cutting slots');

  if (!team.bonus_rider) {
    errors.push('Bonus slot: must select 1 bonus rider');
  } else if (!riderMap[team.bonus_rider]) {
    errors.push(`Bonus slot: rider '${team.bonus_rider}' not found in roster`);
  }

  return { valid: errors.length === 0, errors };
}


// ── Demo / test run ───────────────────────────────────────────────────────────
// Remove or gate behind a flag before connecting to production data.

/**
 * Demo: Calculate a sample team score against sample results.
 * Demonstrates the scoring engine with placeholder data.
 */
function demoScoringRun() {
  const sampleTeam = {
    team_id:     'demo-team-001',
    team_name:   'Sliding Stop Squad',
    reining:     ['andrea-fappani', 'casey-deary'],
    cow_horse:   ['corey-cushing', 'boyd-rice'],
    cutting:     ['adan-banuelos', 'beau-galyean'],
    bonus_rider: 'austin-shepard'
  };

  const sampleResults = [
    { rider_id: 'andrea-fappani', discipline: 'reining',   event_id: 'run-for-a-million-2025', class_name: 'Open', place: 1, score: 228.5, qualified: true, disqualified: false, bonuses_earned: ['discipline_winner'] },
    { rider_id: 'casey-deary',    discipline: 'reining',   event_id: 'run-for-a-million-2025', class_name: 'Open', place: 4, score: 221.0, qualified: true, disqualified: false, bonuses_earned: [] },
    { rider_id: 'corey-cushing',  discipline: 'cow-horse', event_id: 'run-for-a-million-2025', class_name: 'Composite', place: 2, score: 441.5, qualified: true, disqualified: false, bonuses_earned: [] },
    { rider_id: 'boyd-rice',      discipline: 'cow-horse', event_id: 'run-for-a-million-2025', class_name: 'Composite', place: 7, score: 432.0, qualified: true, disqualified: false, bonuses_earned: [] },
    { rider_id: 'adan-banuelos',  discipline: 'cutting',   event_id: 'run-for-a-million-2025', class_name: 'Open', place: 1, score: 228.0, qualified: true, disqualified: false, bonuses_earned: ['discipline_winner', 'highest_composite'] },
    { rider_id: 'beau-galyean',   discipline: 'cutting',   event_id: 'run-for-a-million-2025', class_name: 'Open', place: 12, score: 218.5, qualified: true, disqualified: false, bonuses_earned: [] },
    { rider_id: 'austin-shepard', discipline: 'cutting',   event_id: 'run-for-a-million-2025', class_name: 'Open', place: 3, score: 225.0, qualified: true, disqualified: false, bonuses_earned: ['comeback_rider'] }
  ];

  const score = calculateTeamScore(sampleTeam, sampleResults);
  return score;
}


// ── Exports ───────────────────────────────────────────────────────────────────
// Module exports for Node.js environments and future bundling.
// Browser use: attach to window.FantasyEngine or import as ES module.

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCORING_CONFIG,
    getPlacementPoints,
    getBonusPoints,
    getRiderPoints,
    calculateTeamScore,
    rankTeams,
    validateTeamRoster,
    demoScoringRun
  };
}

// ES Module export (uncomment when migrating to ESM):
// export { SCORING_CONFIG, getPlacementPoints, getBonusPoints, getRiderPoints,
//          calculateTeamScore, rankTeams, validateTeamRoster, demoScoringRun };
