/**
 * Fantasy Run For A Million — Data Loader
 * ========================================
 * Connector stubs for CMS, Supabase, and static file data sources.
 * CURRENT STATE: All functions return static/local data.
 * FUTURE STATE: Replace return statements with actual API calls.
 *
 * Integration priority order:
 *   1. Supabase (event results, leaderboard, team submissions) — highest priority
 *   2. Static JSON files (riders, events, scoring config) — working now
 *   3. Headless CMS (articles, editorial content) — phase 3
 *   4. Cloudflare KV or D1 (caching, fast reads) — phase 4
 *
 * Supabase project: ptuuuishzwwgmaexneul
 * Supabase anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *   (read-only via RLS — safe to use in client-side JS)
 *
 * @version 1.0.0
 * @status  placeholder
 */

'use strict';

// ── Configuration ─────────────────────────────────────────────────────────────

const CONFIG = {
  supabase: {
    url:      'https://ptuuuishzwwgmaexneul.supabase.co',
    anon_key: null,  // TODO: set from environment — never hardcode in client JS
    tables: {
      riders:          'riders',
      events:          'events',
      results:         'event_results',
      fantasy_teams:   'fantasy_teams',
      leaderboard:     'leaderboard',
      scoring_config:  'scoring_config',
      articles:        'articles'
    }
  },
  static_data: {
    base_url:       '/data',
    riders:         '/data/riders.json',
    events:         '/data/events.json',
    scoring_config: '/data/scoring-config.json',
    articles:       '/data/articles.json'
  },
  cms: {
    provider:   null,     // 'sanity' | 'contentful' | null
    project_id: null,
    dataset:    'production',
    api_token:  null      // TODO: use environment variable
  },
  cache: {
    ttl_seconds: 300,     // 5 minutes for leaderboard/results
    static_ttl:  86400    // 24 hours for rider/event data
  }
};


// ── Static data loaders (CURRENTLY ACTIVE) ────────────────────────────────────

/**
 * Load all riders from local JSON file.
 * Future: Replace with Supabase SELECT or CMS query.
 *
 * @returns {Promise<Object[]>} Array of rider objects
 */
async function loadRiders() {
  // CURRENT: fetch from static file
  try {
    const response = await fetch(CONFIG.static_data.riders);
    if (!response.ok) throw new Error(`Failed to load riders: ${response.status}`);
    const data = await response.json();
    return data.riders || [];
  } catch (err) {
    console.error('[DataLoader] loadRiders failed:', err.message);
    return [];
  }

  // FUTURE (Supabase):
  // const { data, error } = await supabase.from(CONFIG.supabase.tables.riders).select('*').eq('fantasy_eligible', true);
  // if (error) throw error;
  // return data;
}

/**
 * Load riders filtered by discipline.
 *
 * @param  {'reining'|'cow-horse'|'cutting'} discipline
 * @returns {Promise<Object[]>}
 */
async function loadRidersByDiscipline(discipline) {
  const riders = await loadRiders();
  return riders.filter(r => r.discipline === discipline);
}

/**
 * Load a single rider by slug.
 *
 * @param  {string} slug - e.g. 'andrea-fappani'
 * @returns {Promise<Object|null>}
 */
async function loadRider(slug) {
  const riders = await loadRiders();
  return riders.find(r => r.slug === slug) || null;
}

/**
 * Load all events.
 * Future: Replace with Supabase query filtered by status.
 *
 * @returns {Promise<Object[]>}
 */
async function loadEvents() {
  try {
    const response = await fetch(CONFIG.static_data.events);
    if (!response.ok) throw new Error(`Failed to load events: ${response.status}`);
    const data = await response.json();
    return data.events || [];
  } catch (err) {
    console.error('[DataLoader] loadEvents failed:', err.message);
    return [];
  }

  // FUTURE (Supabase):
  // const { data, error } = await supabase.from(CONFIG.supabase.tables.events).select('*').eq('status', 'active');
  // if (error) throw error;
  // return data;
}

/**
 * Load a single event by slug.
 *
 * @param  {string} slug - e.g. 'run-for-a-million'
 * @returns {Promise<Object|null>}
 */
async function loadEvent(slug) {
  const events = await loadEvents();
  return events.find(e => e.slug === slug) || null;
}

/**
 * Load scoring configuration.
 *
 * @returns {Promise<Object>}
 */
async function loadScoringConfig() {
  try {
    const response = await fetch(CONFIG.static_data.scoring_config);
    if (!response.ok) throw new Error(`Failed to load scoring config: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('[DataLoader] loadScoringConfig failed:', err.message);
    return null;
  }
}

/**
 * Load articles, optionally filtered by category or discipline.
 *
 * @param  {{ category?: string, discipline?: string, status?: string }} filters
 * @returns {Promise<Object[]>}
 */
async function loadArticles(filters = {}) {
  try {
    const response = await fetch(CONFIG.static_data.articles);
    if (!response.ok) throw new Error(`Failed to load articles: ${response.status}`);
    const data = await response.json();
    let articles = (data.placeholder_articles || []).filter(a => a.status !== 'archived');

    if (filters.category)   articles = articles.filter(a => a.category === filters.category);
    if (filters.discipline) articles = articles.filter(a => a.discipline === filters.discipline);
    if (filters.status)     articles = articles.filter(a => a.status === filters.status);

    return articles;
  } catch (err) {
    console.error('[DataLoader] loadArticles failed:', err.message);
    return [];
  }

  // FUTURE (Sanity CMS):
  // const query = `*[_type == "article" && status == "published"] | order(published_date desc) { title, slug, excerpt, category, discipline, published_date, featured_image, rider_references }`;
  // return await sanityClient.fetch(query);
}


// ── Supabase data loaders (FUTURE — stub implementations) ─────────────────────

/**
 * Load event results for a specific event.
 * STUB — returns empty array until Supabase is connected.
 *
 * @param  {string} event_id
 * @returns {Promise<Object[]>}
 */
async function loadEventResults(event_id) {
  console.warn('[DataLoader] loadEventResults: Supabase not yet connected. Returning empty array.');
  return [];

  // FUTURE (Supabase):
  // const { data, error } = await supabase.from(CONFIG.supabase.tables.results).select('*').eq('event_id', event_id);
  // if (error) throw error;
  // return data;
}

/**
 * Load fantasy leaderboard for a specific event.
 * STUB — returns empty array until Supabase is connected.
 *
 * @param  {string} event_id
 * @param  {number} limit - Max results to return
 * @returns {Promise<Object[]>}
 */
async function loadLeaderboard(event_id, limit = 100) {
  console.warn('[DataLoader] loadLeaderboard: Supabase not yet connected. Returning empty array.');
  return [];

  // FUTURE (Supabase):
  // const { data, error } = await supabase.from(CONFIG.supabase.tables.leaderboard)
  //   .select('team_name, total_points, rank, discipline_breakdown')
  //   .eq('event_id', event_id)
  //   .order('rank', { ascending: true })
  //   .limit(limit);
  // if (error) throw error;
  // return data;
}

/**
 * Submit a fantasy team entry.
 * STUB — logs submission but does not persist until Supabase is connected.
 *
 * @param  {Object} teamData - { team_name, email, reining, cow_horse, cutting, bonus_rider }
 * @returns {Promise<{ success: boolean, entry_id: string|null, error: string|null }>}
 */
async function submitFantasyTeam(teamData) {
  console.warn('[DataLoader] submitFantasyTeam: Backend not yet connected. Entry not saved.');
  console.log('[DataLoader] Demo submission data:', teamData);
  return { success: false, entry_id: null, error: 'Contest entry not yet open' };

  // FUTURE (Supabase):
  // const { data, error } = await supabase.from(CONFIG.supabase.tables.fantasy_teams).insert([{
  //   team_name:    teamData.team_name,
  //   email:        teamData.email,
  //   reining:      teamData.reining,
  //   cow_horse:    teamData.cow_horse,
  //   cutting:      teamData.cutting,
  //   bonus_rider:  teamData.bonus_rider,
  //   event_id:     'run-for-a-million-2025',
  //   submitted_at: new Date().toISOString()
  // }]).select('id').single();
  // if (error) return { success: false, entry_id: null, error: error.message };
  // return { success: true, entry_id: data.id, error: null };
}


// ── CMS loaders (FUTURE — Phase 3) ────────────────────────────────────────────

/**
 * Load a single article by slug from CMS.
 * STUB — returns null until CMS is connected.
 *
 * @param  {string} slug
 * @returns {Promise<Object|null>}
 */
async function loadArticleBySlug(slug) {
  console.warn('[DataLoader] loadArticleBySlug: CMS not yet connected.');
  const articles = await loadArticles();
  return articles.find(a => a.slug === slug) || null;

  // FUTURE (Sanity):
  // return await sanityClient.fetch(`*[_type == "article" && slug.current == $slug][0]`, { slug });
}


// ── Exports ───────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    loadRiders, loadRidersByDiscipline, loadRider,
    loadEvents, loadEvent,
    loadScoringConfig,
    loadArticles, loadArticleBySlug,
    loadEventResults,
    loadLeaderboard,
    submitFantasyTeam
  };
}
