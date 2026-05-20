/**
 * Fantasy Run For A Million — Fantasy Scoring Engine
 * =====================================================
 * Pure JavaScript scoring functions. Zero dependencies.
 * No DOM manipulation. No API calls. No side effects.
 * Usable in browser, Cloudflare Worker, or Node.js.
 *
 * CURRENT STATE: Implemented and ready — awaiting live event results.
 *
 * INTEGRATION FLOW:
 *   1. Admin enters official results via /admin/results (Worker-proxied Supabase insert)
 *   2. Admin triggers scoring run → this engine calculates all team scores
 *   3. generateLeaderboardSnapshot() formats output for DB
 *   4. Worker writes snapshot to public.leaderboard_snapshots
 *   5. Public /leaderboard page reads snapshots via anon key (SELECT only)
 *
 * @version 2.0.0
 * @status  ready — awaiting live results input
 */

'use strict';

/* ── Scoring Configuration ─────────────────────────────────────────────────────
   Source of truth: /data/scoring-config.json
   This inline config mirrors that file for standalone/Worker use.
   Version this object whenever point values change.
────────────────────────────────────────────────────────────────────────────── */

const SCORING_CONFIG = {
  version: 'v1',
  event_id: 'run-for-a-million-2025',

  placement_points: {
    1: 100, 2: 80, 3: 65, 4: 50, 5: 40,
    6: 25,  7: 25, 8: 25, 9: 25, 10: 25,
    qualified: 10,   // any completed run outside top 10
    dnf:        0,   // did not finish / disqualified
  },

  bonus_events: {
    discipline_winner:  { points: 25, label: 'Discipline Winner',    trigger: 'auto'   },
    highest_composite:  { points: 20, label: 'Highest Composite',    trigger: 'auto'   },
    comeback_rider:     { points: 15, label: 'Comeback Rider',       trigger: 'manual' },
    rookie_underdog:    { points: 15, label: 'Rookie / Underdog',    trigger: 'manual' },
    fan_favorite:       { points: 10, label: 'Fan Favorite',         trigger: 'manual' },
  },

  tiebreaker: [
    'most_discipline_winners',   // most riders who won their class
    'highest_single_placing',    // best individual placing across all riders
    'earliest_submission',       // earliest team submission timestamp
  ],

  roster_slots: {
    reining:   { count: 2, discipline: 'reining'   },
    cow_horse: { count: 2, discipline: 'cow-horse' },
    cutting:   { count: 2, discipline: 'cutting'   },
    bonus:     { count: 1, discipline: 'any'       },
  },
};

/* ── Type definitions (JSDoc) ──────────────────────────────────────────────────

@typedef {Object} RiderResult
@property {string}   event_slug     - 'run-for-a-million-2025'
@property {string}   discipline     - 'reining' | 'cow-horse' | 'cutting'
@property {string}   rider_slug     - e.g. 'andrea-fappani'
@property {number}   placing        - 1–N, or null for DNS/DQ
@property {number}   [score]        - raw competition score
@property {number}   fantasy_points - computed placement points
@property {string[]} [bonus_flags]  - applied bonus event keys

@typedef {Object} FantasyTeam
@property {string}      id          - UUID
@property {string}      team_name
@property {string}      email
@property {TeamRider[]} riders      - from fantasy_team_riders join

@typedef {Object} TeamRider
@property {string}  rider_slug
@property {string}  discipline
@property {string}  slot_type  - 'discipline' | 'bonus'

@typedef {Object} TeamScore
@property {string}   team_id
@property {string}   team_name
@property {string}   email
@property {number}   total_points
@property {number}   bonus_points
@property {number}   placement_points
@property {number}   rank           - set by rankLeaderboard()
@property {number}   riders_with_results
@property {Object[]} breakdown      - per-rider detail
@property {Object[]} bonuses_applied

────────────────────────────────────────────────────────────────────────────── */


/* ── Core Scoring Functions ─────────────────────────────────────────────────── */

/**
 * Returns placement points for a given placing number.
 * @param {number|null} placing - integer placing (1=first), or null for no result
 * @returns {number} fantasy points
 */
function calculateFantasyPoints(placing) {
  if (!placing || placing < 1) return 0;
  const p = SCORING_CONFIG.placement_points;
  if (placing <= 10) return p[placing] ?? 0;
  return p.qualified;  // outside top 10 but completed a qualified run
}

/**
 * Determines which bonus events apply to a team's riders.
 * @param {Object[]} teamRiderResults - rider results for this team only
 * @param {Object[]} allResults       - all rider results for this event
 * @param {Object}   [config]         - optional config override
 * @returns {{ totalBonus: number, applied: Object[] }}
 */
function applyDisciplineBonuses(teamRiderResults, allResults, config = SCORING_CONFIG) {
  const bonusCfg = config.bonus_events;
  let   totalBonus = 0;
  const applied    = [];

  // Build discipline winner lookup from all results
  const disciplineWinners = {};
  allResults.forEach(r => {
    if (r.placing === 1) disciplineWinners[r.discipline] = r.rider_slug;
  });

  // Build highest composite score lookup (per discipline)
  const disciplineTopScore = {};
  allResults.forEach(r => {
    if (r.score != null) {
      if (!disciplineTopScore[r.discipline] || r.score > disciplineTopScore[r.discipline].score) {
        disciplineTopScore[r.discipline] = { rider_slug: r.rider_slug, score: r.score };
      }
    }
  });

  // Auto bonuses: check each team rider
  teamRiderResults.forEach(tr => {
    // Discipline winner bonus
    if (disciplineWinners[tr.discipline] === tr.rider_slug) {
      const pts = bonusCfg.discipline_winner.points;
      totalBonus += pts;
      applied.push({
        type:       'discipline_winner',
        label:      bonusCfg.discipline_winner.label,
        discipline: tr.discipline,
        rider_slug: tr.rider_slug,
        points:     pts,
      });
    }

    // Highest composite score bonus (auto, where score data available)
    const topScore = disciplineTopScore[tr.discipline];
    if (topScore && topScore.rider_slug === tr.rider_slug) {
      const pts = bonusCfg.highest_composite.points;
      totalBonus += pts;
      applied.push({
        type:       'highest_composite',
        label:      bonusCfg.highest_composite.label,
        discipline: tr.discipline,
        rider_slug: tr.rider_slug,
        points:     pts,
      });
    }
  });

  // Manual bonuses: read from result bonus_flags field
  teamRiderResults.forEach(tr => {
    const flags = tr.bonus_flags || [];
    ['comeback_rider', 'rookie_underdog', 'fan_favorite'].forEach(key => {
      if (flags.includes(key) && bonusCfg[key]) {
        const pts = bonusCfg[key].points;
        totalBonus += pts;
        applied.push({
          type:       key,
          label:      bonusCfg[key].label,
          discipline: tr.discipline,
          rider_slug: tr.rider_slug,
          points:     pts,
        });
      }
    });
  });

  return { totalBonus, applied };
}

/**
 * Calculates the fantasy score for a single team.
 * @param {FantasyTeam} team
 * @param {RiderResult[]} allResults - all event results (for bonus calculation)
 * @returns {TeamScore}
 */
function calculateTeamScore(team, allResults) {
  // Build a fast lookup: `discipline::rider_slug` → result
  const resultMap = {};
  allResults.forEach(r => {
    resultMap[`${r.discipline}::${r.rider_slug}`] = r;
  });

  let placementPoints = 0;
  let ridersWithResults = 0;

  const breakdown = (team.riders || []).map(rider => {
    const key    = `${rider.discipline}::${rider.rider_slug}`;
    const result = resultMap[key] || null;
    const placing = result ? result.placing : null;
    const points  = calculateFantasyPoints(placing);

    if (result) ridersWithResults++;
    placementPoints += points;

    return {
      rider_slug:    rider.rider_slug,
      discipline:    rider.discipline,
      slot_type:     rider.slot_type,
      placing,
      score:         result ? result.score    : null,
      fantasy_points: points,
      has_result:    !!result,
    };
  });

  // Apply bonuses using team's riders-with-results
  const riderResultsForTeam = breakdown.filter(r => r.has_result).map(r => ({
    rider_slug:  r.rider_slug,
    discipline:  r.discipline,
    bonus_flags: (allResults.find(ar =>
      ar.discipline === r.discipline && ar.rider_slug === r.rider_slug
    ) || {}).bonus_flags || [],
  }));

  const { totalBonus, applied } = applyDisciplineBonuses(riderResultsForTeam, allResults);

  return {
    team_id:             team.id,
    team_name:           team.team_name,
    email:               team.email,
    placement_points:    placementPoints,
    bonus_points:        totalBonus,
    total_points:        placementPoints + totalBonus,
    riders_with_results: ridersWithResults,
    rider_count:         (team.riders || []).length,
    breakdown,
    bonuses_applied:     applied,
    rank:                null,  // set by rankLeaderboard()
  };
}

/**
 * Calculates scores for all teams and returns an unranked array.
 * @param {FantasyTeam[]} teams
 * @param {RiderResult[]} allResults
 * @returns {TeamScore[]}
 */
function calculateLeaderboard(teams, allResults) {
  return teams.map(team => calculateTeamScore(team, allResults));
}

/**
 * Sorts team scores and assigns ranks, handling ties correctly.
 * Tiebreaker: most discipline winners → highest single placing → earliest submission (by team_id alpha as proxy).
 * @param {TeamScore[]} scores
 * @returns {TeamScore[]} sorted with rank assigned
 */
function rankLeaderboard(scores) {
  const sorted = [...scores].sort((a, b) => {
    // Primary: total points descending
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;

    // Tiebreaker 1: most discipline winner bonuses
    const aWins = (a.bonuses_applied || []).filter(x => x.type === 'discipline_winner').length;
    const bWins = (b.bonuses_applied || []).filter(x => x.type === 'discipline_winner').length;
    if (bWins !== aWins) return bWins - aWins;

    // Tiebreaker 2: best single placing (lowest number = better)
    const bestPlacing = team => {
      const placings = (team.breakdown || [])
        .map(r => r.placing)
        .filter(p => p != null && p > 0);
      return placings.length ? Math.min(...placings) : 999;
    };
    const aBest = bestPlacing(a);
    const bBest = bestPlacing(b);
    if (aBest !== bBest) return aBest - bBest;

    // Tiebreaker 3: earliest submission (team_id as proxy — lower UUID = earlier)
    return (a.team_id || '').localeCompare(b.team_id || '');
  });

  // Assign ranks with tie grouping
  let rank = 1;
  sorted.forEach((team, i) => {
    if (i > 0 && sorted[i - 1].total_points === team.total_points) {
      team.rank = sorted[i - 1].rank;  // tied — same rank
    } else {
      team.rank = rank;
    }
    rank++;
  });

  return sorted;
}

/**
 * Converts ranked leaderboard scores into DB-ready snapshot rows.
 * @param {TeamScore[]} rankedScores - output of rankLeaderboard()
 * @param {string} [eventSlug]
 * @returns {Object[]} ready for INSERT into public.leaderboard_snapshots
 */
function generateLeaderboardSnapshot(rankedScores, eventSlug = 'run-for-a-million-2025') {
  const snapshotDate = new Date().toISOString();
  return rankedScores.map(team => ({
    event_slug:      eventSlug,
    fantasy_team_id: team.team_id,
    total_points:    team.total_points,
    bonus_points:    team.bonus_points,
    rank:            team.rank,
    rider_count:     team.riders_with_results,
    is_current:      true,
    snapshot_date:   snapshotDate,
  }));
}

/**
 * Full scoring pipeline — convenience wrapper.
 * @param {FantasyTeam[]} teams
 * @param {RiderResult[]} results
 * @param {string} [eventSlug]
 * @returns {{ ranked: TeamScore[], snapshot: Object[] }}
 */
function runFullScoring(teams, results, eventSlug = 'run-for-a-million-2025') {
  const scores   = calculateLeaderboard(teams, results);
  const ranked   = rankLeaderboard(scores);
  const snapshot = generateLeaderboardSnapshot(ranked, eventSlug);
  return { ranked, snapshot };
}


/* ── Mock / Development Data ───────────────────────────────────────────────────
   Replace with live data from Supabase when event results are entered.
────────────────────────────────────────────────────────────────────────────── */

const MOCK_RESULTS = [
  { event_slug:'run-for-a-million-2025', discipline:'reining',   rider_slug:'andrea-fappani',   placing:1, score:225.5, fantasy_points:100, bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'reining',   rider_slug:'casey-deary',       placing:2, score:222.0, fantasy_points:80,  bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'reining',   rider_slug:'cade-mccutcheon',   placing:3, score:219.5, fantasy_points:65,  bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'reining',   rider_slug:'matt-mills',        placing:4, score:217.0, fantasy_points:50,  bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'reining',   rider_slug:'arnaud-girinon',    placing:5, score:215.5, fantasy_points:40,  bonus_flags:['comeback_rider'] },
  { event_slug:'run-for-a-million-2025', discipline:'cow-horse', rider_slug:'corey-cushing',     placing:1, score:438.0, fantasy_points:100, bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'cow-horse', rider_slug:'boyd-rice',         placing:2, score:432.5, fantasy_points:80,  bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'cow-horse', rider_slug:'chris-dawson',      placing:3, score:428.0, fantasy_points:65,  bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'cutting',   rider_slug:'adan-banuelos',     placing:1, score:149.0, fantasy_points:100, bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'cutting',   rider_slug:'beau-galyean',      placing:2, score:147.5, fantasy_points:80,  bonus_flags:[] },
  { event_slug:'run-for-a-million-2025', discipline:'cutting',   rider_slug:'austin-shepard',    placing:3, score:146.0, fantasy_points:65,  bonus_flags:['rookie_underdog'] },
];

const MOCK_TEAMS = [
  { id:'team-001', team_name:'Sliding Stop Squad',   email:'test1@example.com', riders:[
    { rider_slug:'andrea-fappani',  discipline:'reining',   slot_type:'discipline' },
    { rider_slug:'casey-deary',     discipline:'reining',   slot_type:'discipline' },
    { rider_slug:'corey-cushing',   discipline:'cow-horse', slot_type:'discipline' },
    { rider_slug:'boyd-rice',       discipline:'cow-horse', slot_type:'discipline' },
    { rider_slug:'adan-banuelos',   discipline:'cutting',   slot_type:'discipline' },
    { rider_slug:'beau-galyean',    discipline:'cutting',   slot_type:'discipline' },
    { rider_slug:'cade-mccutcheon', discipline:'reining',   slot_type:'bonus' },
  ]},
  { id:'team-002', team_name:'Cow Country Kings', email:'test2@example.com', riders:[
    { rider_slug:'arnaud-girinon',  discipline:'reining',   slot_type:'discipline' },
    { rider_slug:'cade-mccutcheon', discipline:'reining',   slot_type:'discipline' },
    { rider_slug:'corey-cushing',   discipline:'cow-horse', slot_type:'discipline' },
    { rider_slug:'chris-dawson',    discipline:'cow-horse', slot_type:'discipline' },
    { rider_slug:'adan-banuelos',   discipline:'cutting',   slot_type:'discipline' },
    { rider_slug:'austin-shepard',  discipline:'cutting',   slot_type:'discipline' },
    { rider_slug:'boyd-rice',       discipline:'cow-horse', slot_type:'bonus' },
  ]},
];


/* ── Export ─────────────────────────────────────────────────────────────────── */
// Works in browser (window.FRFAM_SCORING), Cloudflare Worker, and Node.js

const FRFAM_SCORING = {
  version:                  '2.0.0',
  CONFIG:                   SCORING_CONFIG,
  MOCK_RESULTS,
  MOCK_TEAMS,
  calculateFantasyPoints,
  applyDisciplineBonuses,
  calculateTeamScore,
  calculateLeaderboard,
  rankLeaderboard,
  generateLeaderboardSnapshot,
  runFullScoring,
};

if (typeof window !== 'undefined') {
  window.FRFAM_SCORING = FRFAM_SCORING;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FRFAM_SCORING;
}
