/*!
 * Fantasy Run For A Million — Cross-Link Engine  v1.0
 * /engine/cross-links.js
 *
 * Automatically injects contextual related-content blocks into every
 * page type based on body[data-page-type] and sibling data attributes.
 * Data is sourced from /data/riders.json, /data/articles.json, /data/events.json.
 * All injection is deferred, non-blocking, and gracefully degrades on fetch failure.
 *
 * Page types handled:
 *   rider_profile   → sidebar: articles about rider + related events
 *                     section: related articles (before .back-nav)
 *   article         → sidebar: events + fantasy tools
 *                     related-articles section: smarter pool
 *   discipline_page → article strip: augmented with extra articles
 *                     sidebar: strategy articles card
 *                     section: related events (appended to main)
 *   events_page     → section: eligible riders grid (appended to main)
 *                     section: related articles (appended to main)
 *                     sidebar: strategy articles card
 *
 * Matching heuristics (no over-engineering):
 *   Same discipline → same article category → shared rider refs → fantasy-tips fallback
 *
 * SEO notes:
 *   Injected links use contextual anchor text and are fully crawlable by Googlebot
 *   (which renders JS). Static fallbacks remain functional with JS disabled.
 *   No duplicate link blocks: engine checks existing content before injecting.
 */
(function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  var DATA = '/data';
  var MAX  = { riders: 6, articles: 3, events: 3 };
  var _cache = {};

  // ─── Fetch helpers ─────────────────────────────────────────────────────────
  function fetchJSON(path) {
    if (_cache[path]) return Promise.resolve(_cache[path]);
    return fetch(path)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { _cache[path] = d; return d; })
      .catch(function () { return null; });
  }

  function getRiders()   { return fetchJSON(DATA + '/riders.json').then(function(d){ return (d && d.riders) || []; }); }
  function getArticles() { return fetchJSON(DATA + '/articles.json').then(function(d){ return (d && d.placeholder_articles) || []; }); }
  function getEvents()   { return fetchJSON(DATA + '/events.json').then(function(d){ return (d && d.events) || []; }); }

  // ─── Heuristic matchers ────────────────────────────────────────────────────
  function uniq(arr) {
    var seen = {};
    return arr.filter(function(a) {
      if (!a || seen[a.slug]) return false;
      seen[a.slug] = true;
      return true;
    });
  }

  function byDisc(arts, disc, exclude) {
    return arts.filter(function(a) {
      return a.slug !== exclude && (a.discipline === disc || a.category === disc);
    });
  }
  function byCat(arts, cat, exclude) {
    return arts.filter(function(a) { return a.slug !== exclude && a.category === cat; });
  }
  function byRider(arts, rSlug, exclude) {
    return arts.filter(function(a) {
      return a.slug !== exclude && (a.rider_references || []).indexOf(rSlug) !== -1;
    });
  }
  function fantasyArts(arts, exclude) {
    return arts.filter(function(a) {
      return a.slug !== exclude && (a.category === 'fantasy-tips' || a.category === 'rider-profiles');
    });
  }
  function profiled(rids, disc, exclude) {
    return rids.filter(function(r) {
      return r.discipline === disc && r.slug !== exclude && r.profiled === true && r.profile_url;
    });
  }
  function eventsByDisc(evts, disc) {
    return evts.filter(function(e) { return (e.disciplines || []).indexOf(disc) !== -1; });
  }

  // ─── Label maps ────────────────────────────────────────────────────────────
  function discLabel(d) {
    return { 'reining': 'Reining', 'cow-horse': 'Cow Horse', 'cutting': 'Cutting' }[d] || d;
  }
  function catLabel(c) {
    var map = {
      'reining': 'Reining', 'cow-horse': 'Cow Horse', 'cutting': 'Cutting',
      'fantasy-tips': 'Fantasy Strategy', 'event-coverage': 'Event Coverage',
      'rider-profiles': 'Rider Spotlight', 'western-sports': 'Western Sports'
    };
    return map[c] || c;
  }

  // ─── Shared CSS (injected once) ────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('xlink-css')) return;
    var s = document.createElement('style');
    s.id = 'xlink-css';
    s.textContent = [
      /* Layout sections */
      '.xl-sect{padding:48px 0;border-top:1px solid rgba(201,168,76,.08);}',
      '.xl-sect.xl-alt{background:var(--dark-mid);}',
      /* Typography */
      '.xl-label{font-size:.7rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;display:block;}',
      '.xl-h{font-family:var(--font-display,"Playfair Display",Georgia,serif);font-size:clamp(1.2rem,2.5vw,1.7rem);font-weight:700;color:var(--white);margin-bottom:8px;}',
      '.xl-div{width:28px;height:2px;background:var(--gold);margin:10px 0 24px;}',
      /* Article card grid */
      '.xl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;}',
      '.xl-card{background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:10px;padding:20px 18px;display:flex;flex-direction:column;gap:8px;}',
      '.xl-cat{font-size:.64rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);opacity:.75;}',
      '.xl-title{font-size:.9rem;font-weight:600;color:var(--white);line-height:1.35;flex:1;}',
      '.xl-excerpt{font-size:.8rem;color:var(--cream-dim);opacity:.7;line-height:1.5;margin:0;}',
      '.xl-link{font-size:.78rem;font-weight:600;color:var(--gold);display:inline-flex;align-items:center;gap:5px;padding-top:6px;margin-top:auto;}',
      '.xl-link::after{content:"→";}',
      /* View all */
      '.xl-more{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-top:20px;}',
      /* Sidebar card (reuses rider-page tokens) */
      '.xl-sc{background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:var(--radius-lg,10px);padding:18px 20px;display:flex;flex-direction:column;gap:6px;}',
      '.xl-sc-title{font-size:.68rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);opacity:.7;margin-bottom:4px;}',
      '.xl-sc-link{display:flex;align-items:center;gap:8px;font-size:.83rem;color:var(--cream-dim);padding:7px 0;border-bottom:1px solid rgba(201,168,76,.07);transition:color .2s;}',
      '.xl-sc-link:last-child{border-bottom:none;}',
      '.xl-sc-link:hover{color:var(--gold);}',
      '.xl-sc-link::before{content:"→";font-size:.7rem;color:var(--gold);opacity:.5;}',
      '@media(max-width:600px){.xl-grid{grid-template-columns:1fr;}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ─── HTML builders ─────────────────────────────────────────────────────────
  function artCard(a) {
    var excerpt = (a.excerpt || '').slice(0, 115);
    if ((a.excerpt || '').length > 115) excerpt += '\u2026';
    return '<div class="xl-card">'
      + '<p class="xl-cat">' + catLabel(a.category) + '</p>'
      + '<p class="xl-title">' + a.title + '</p>'
      + (excerpt ? '<p class="xl-excerpt">' + excerpt + '</p>' : '')
      + '<a href="/news/' + a.slug + '" class="xl-link">Read Article</a>'
      + '</div>';
  }

  function sidebarCard(title, links) {
    return '<div class="xl-sc">'
      + '<p class="xl-sc-title">' + title + '</p>'
      + links.map(function(l) {
          return '<a href="' + l.url + '" class="xl-sc-link">' + l.label + '</a>';
        }).join('')
      + '</div>';
  }

  // ─── DOM helpers ───────────────────────────────────────────────────────────
  function insertBefore(refEl, html) {
    if (!refEl) return;
    var t = document.createElement('template');
    if (t.content !== undefined) {
      t.innerHTML = html;
      refEl.parentNode.insertBefore(t.content.firstElementChild, refEl);
    } else {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      refEl.parentNode.insertBefore(wrap.firstElementChild, refEl);
    }
  }

  function appendTo(parent, html) {
    if (!parent) return;
    var t = document.createElement('template');
    if (t.content !== undefined) {
      t.innerHTML = html;
      parent.appendChild(t.content.firstElementChild);
    } else {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      parent.appendChild(wrap.firstElementChild);
    }
  }

  // guard: skip if already injected (idempotent)
  function alreadyInjected(id) {
    return !!document.getElementById(id);
  }

  // ─── RIDER PROFILE handler ─────────────────────────────────────────────────
  function handleRider(body) {
    var rSlug = body.dataset.riderSlug;
    var disc  = body.dataset.riderDiscipline;
    if (!rSlug || !disc) return;

    Promise.all([getRiders(), getArticles(), getEvents()])
      .then(function(results) {
        var rids = results[0], arts = results[1], evts = results[2];

        // ── Sidebar cards ──────────────────────────────────────────────────
        var sidebar = document.querySelector('.sidebar-col');
        if (sidebar && !alreadyInjected('xl-rider-arts-card')) {
          // Articles featuring this rider
          var rArts = uniq(byRider(arts, rSlug, null)).slice(0, 4);
          if (rArts.length) {
            var card = document.createElement('div');
            card.id = 'xl-rider-arts-card';
            card.innerHTML = sidebarCard('Strategy Articles',
              rArts.map(function(a) { return { url: '/news/' + a.slug, label: a.title }; })
            );
            sidebar.appendChild(card.firstElementChild);
          }

          // Events for this discipline
          var discEvts = eventsByDisc(evts, disc).slice(0, MAX.events);
          if (discEvts.length) {
            var evtLinks = discEvts.map(function(e) { return { url: e.page_url, label: e.name }; });
            evtLinks.push({ url: '/events', label: 'All Events' });
            var evtCard = document.createElement('div');
            evtCard.innerHTML = sidebarCard('Related Events', evtLinks);
            sidebar.appendChild(evtCard.firstElementChild);
          }
        }

        // ── Related articles section before .back-nav ──────────────────────
        var backNav = document.querySelector('.back-nav');
        if (backNav && !alreadyInjected('xl-rider-arts-sect')) {
          var pool = uniq(
            byRider(arts, rSlug, null)
              .concat(byDisc(arts, disc, null))
              .concat(fantasyArts(arts, null))
          ).slice(0, MAX.articles);

          if (pool.length) {
            insertBefore(backNav,
              '<section class="xl-sect xl-alt" id="xl-rider-arts-sect" aria-labelledby="xl-ra-' + rSlug + '">'
              + '<div class="container">'
              + '<span class="xl-label">Fantasy Strategy &amp; Analysis</span>'
              + '<h2 class="xl-h" id="xl-ra-' + rSlug + '">Related Articles</h2>'
              + '<div class="xl-div" aria-hidden="true"></div>'
              + '<div class="xl-grid" role="list">' + pool.map(artCard).join('') + '</div>'
              + '<a href="/news" class="xl-more">All Articles \u2192</a>'
              + '</div>'
              + '</section>'
            );
          }
        }
      });
  }

  // ─── ARTICLE handler ───────────────────────────────────────────────────────
  function handleArticle(body) {
    var slug = body.dataset.articleSlug;
    var cat  = body.dataset.articleCategory;
    if (!slug) return;

    Promise.all([getArticles(), getEvents()])
      .then(function(results) {
        var arts = results[0], evts = results[1];
        var thisArt = null;
        for (var i = 0; i < arts.length; i++) {
          if (arts[i].slug === slug) { thisArt = arts[i]; break; }
        }
        var disc  = thisArt ? (thisArt.discipline || null) : null;
        var rRefs = thisArt ? (thisArt.rider_references || []) : [];

        // ── Sidebar augmentation ───────────────────────────────────────────
        var sidebar = document.querySelector('.article-sidebar');
        if (sidebar && !alreadyInjected('xl-art-evts-card')) {
          // Related events card
          var relEvts = disc
            ? eventsByDisc(evts, disc).slice(0, MAX.events)
            : evts.filter(function(e) { return e.is_fantasy_anchor; }).slice(0, 2);
          if (relEvts.length) {
            var evtHtml = '<div class="sidebar-card" id="xl-art-evts-card">'
              + '<div class="sidebar-card-title">Related Events</div>'
              + '<div class="related-links-list">'
              + relEvts.map(function(e) {
                  return '<a href="' + e.page_url + '" class="related-link-item">' + e.name + '</a>';
                }).join('')
              + '<a href="/events" class="related-link-item">All Events</a>'
              + '</div></div>';
            var evtWrap = document.createElement('div');
            evtWrap.innerHTML = evtHtml;
            sidebar.appendChild(evtWrap.firstElementChild);
          }

          // Fantasy tools card (skip if already a fantasy-tips page)
          if (cat !== 'fantasy-tips' && !alreadyInjected('xl-art-tools-card')) {
            var toolHtml = '<div class="sidebar-card" id="xl-art-tools-card">'
              + '<div class="sidebar-card-title">Fantasy Tools</div>'
              + '<div class="related-links-list">'
              + '<a href="/pick-your-team" class="related-link-item">Build Your Team</a>'
              + '<a href="/scoring-rules" class="related-link-item">How Scoring Works</a>'
              + '<a href="/leaderboard" class="related-link-item">Fantasy Leaderboard</a>'
              + '</div></div>';
            var toolWrap = document.createElement('div');
            toolWrap.innerHTML = toolHtml;
            sidebar.appendChild(toolWrap.firstElementChild);
          }
        }

        // ── Enhance related-articles section ───────────────────────────────
        var artCards = document.querySelector('.related-articles .article-cards');
        if (artCards) {
          // Build smarter pool: category → discipline → shared riders → fantasy fallback
          var pool = uniq(
            byCat(arts, cat, slug)
              .concat(disc ? byDisc(arts, disc, slug) : [])
              .concat(arts.filter(function(a) {
                return a.slug !== slug &&
                  (a.rider_references || []).some(function(r) { return rRefs.indexOf(r) !== -1; });
              }))
              .concat(fantasyArts(arts, slug))
          ).slice(0, 3);

          if (pool.length) {
            artCards.innerHTML = pool.map(function(a) {
              var excerpt = (a.excerpt || '').slice(0, 130);
              if ((a.excerpt || '').length > 130) excerpt += '\u2026';
              return '<article class="article-card" role="listitem">'
                + '<div class="ac-cat-bar"></div>'
                + '<div class="ac-body">'
                + '<p class="ac-cat">' + catLabel(a.category) + '</p>'
                + '<h3 class="ac-title">' + a.title + '</h3>'
                + '<p class="ac-excerpt">' + excerpt + '</p>'
                + '<a href="/news/' + a.slug + '" class="ac-link">Read Article</a>'
                + '</div></article>';
            }).join('');
          }
        }
      });
  }

  // ─── DISCIPLINE PAGE handler ───────────────────────────────────────────────
  function handleDiscipline(body) {
    var disc = body.dataset.discipline;
    if (!disc) return;

    Promise.all([getArticles(), getEvents()])
      .then(function(results) {
        var arts = results[0], evts = results[1];

        // ── Augment existing article strip with extra articles ──────────────
        var artStrip = document.querySelector('.disc-article-cards');
        if (artStrip) {
          // Find slugs already shown
          var shown = Array.from(artStrip.querySelectorAll('a.disc-article-card')).map(function(el) {
            return (el.getAttribute('href') || '').split('/').pop();
          });
          var extra = uniq(
            byDisc(arts, disc, null).concat(fantasyArts(arts, null))
          ).filter(function(a) {
            return shown.indexOf(a.slug) === -1;
          }).slice(0, 2);

          extra.forEach(function(a) {
            var card = document.createElement('a');
            card.href = '/news/' + a.slug;
            card.className = 'disc-article-card';
            var excerpt = (a.excerpt || '').slice(0, 110);
            if ((a.excerpt || '').length > 110) excerpt += '\u2026';
            card.innerHTML = '<p class="dac-label">' + catLabel(a.category) + '</p>'
              + '<h3 class="dac-title">' + a.title + '</h3>'
              + '<p class="dac-excerpt">' + excerpt + '</p>'
              + '<span class="dac-link">Read Article</span>';
            artStrip.appendChild(card);
          });
        }

        // ── Related events section appended to main ────────────────────────
        var mainEl = document.querySelector('main');
        if (mainEl && !alreadyInjected('xl-disc-evts-sect')) {
          var discEvts = eventsByDisc(evts, disc);
          if (discEvts.length) {
            appendTo(mainEl,
              '<section class="xl-sect" id="xl-disc-evts-sect" aria-labelledby="xl-de-' + disc + '">'
              + '<div class="container">'
              + '<span class="xl-label">Upcoming Competition</span>'
              + '<h2 class="xl-h" id="xl-de-' + disc + '">Related Events</h2>'
              + '<div class="xl-div" aria-hidden="true"></div>'
              + '<div class="xl-grid" role="list">'
              + discEvts.map(function(e) {
                  return '<div class="xl-card">'
                    + '<p class="xl-cat">' + (e.disciplines || []).map(discLabel).join(' \u00b7 ') + '</p>'
                    + '<p class="xl-title">' + e.name + (e.year ? ' ' + e.year : '') + '</p>'
                    + (e.purse_display ? '<p style="font-size:.8rem;color:var(--gold);opacity:.85;font-weight:600;">Purse: ' + e.purse_display + '</p>' : '')
                    + '<a href="' + e.page_url + '" class="xl-link">Event Overview</a>'
                    + '</div>';
                }).join('')
              + '</div>'
              + '</div></section>'
            );
          }
        }

        // ── Strategy articles card in sidebar ─────────────────────────────
        var discSidebar = document.querySelector('.disc-sidebar');
        if (discSidebar && !alreadyInjected('xl-disc-strat-card')) {
          var stratArts = uniq(byDisc(arts, disc, null).concat(fantasyArts(arts, null))).slice(0, 3);
          if (stratArts.length) {
            var card = document.createElement('div');
            card.id = 'xl-disc-strat-card';
            card.className = 'sidebar-card';
            card.innerHTML = '<div class="sidebar-card-header"><p class="sidebar-card-title">Strategy Articles</p></div>'
              + '<div class="sidebar-links">'
              + stratArts.map(function(a) {
                  return '<a href="/news/' + a.slug + '" class="sidebar-link">' + a.title + '</a>';
                }).join('')
              + '</div>';
            discSidebar.appendChild(card);
          }
        }
      });
  }

  // ─── EVENT PAGE handler ────────────────────────────────────────────────────
  function handleEvent(body) {
    var eSlug = body.dataset.eventSlug;
    if (!eSlug) return;

    Promise.all([getRiders(), getArticles(), getEvents()])
      .then(function(results) {
        var rids = results[0], arts = results[1], evts = results[2];

        // Find this event's disciplines
        var thisEvt = null;
        for (var i = 0; i < evts.length; i++) {
          if (evts[i].slug === eSlug || evts[i].id.indexOf(eSlug) === 0) {
            thisEvt = evts[i]; break;
          }
        }
        var discs = thisEvt ? (thisEvt.disciplines || []) : ['reining', 'cow-horse', 'cutting'];
        var mainEl = document.querySelector('main');
        if (!mainEl) return;

        // ── Eligible riders section ────────────────────────────────────────
        if (!alreadyInjected('xl-evt-riders-sect')) {
          var eligRiders = rids.filter(function(r) {
            return discs.indexOf(r.discipline) !== -1 && r.profiled === true && r.profile_url;
          }).slice(0, MAX.riders);

          if (eligRiders.length) {
            appendTo(mainEl,
              '<section class="xl-sect xl-alt" id="xl-evt-riders-sect" aria-labelledby="xl-er-' + eSlug + '">'
              + '<div class="container">'
              + '<span class="xl-label">Fantasy Game</span>'
              + '<h2 class="xl-h" id="xl-er-' + eSlug + '">Eligible Riders</h2>'
              + '<div class="xl-div" aria-hidden="true"></div>'
              + '<div class="xl-grid" role="list">'
              + eligRiders.map(function(r) {
                  return '<div class="xl-card">'
                    + '<p class="xl-cat">' + discLabel(r.discipline) + '</p>'
                    + '<p class="xl-title">' + r.name + '</p>'
                    + (r.hometown ? '<p style="font-size:.78rem;color:var(--cream-dim);opacity:.6;">\uD83D\uDCCD ' + r.hometown + '</p>' : '')
                    + '<a href="' + r.profile_url + '" class="xl-link">Fantasy Profile</a>'
                    + '</div>';
                }).join('')
              + '</div>'
              + '<a href="/riders" class="xl-more">All Riders \u2192</a>'
              + '</div></section>'
            );
          }
        }

        // ── Related articles section ───────────────────────────────────────
        if (!alreadyInjected('xl-evt-arts-sect')) {
          var artPool = uniq(
            arts.filter(function(a) { return (a.event_references || []).indexOf(eSlug) !== -1; })
              .concat(fantasyArts(arts, null))
              .concat(discs.reduce(function(acc, d) { return acc.concat(byDisc(arts, d, null)); }, []))
          ).slice(0, MAX.articles);

          if (artPool.length) {
            appendTo(mainEl,
              '<section class="xl-sect" id="xl-evt-arts-sect" aria-labelledby="xl-ea-' + eSlug + '">'
              + '<div class="container">'
              + '<span class="xl-label">Fantasy Strategy</span>'
              + '<h2 class="xl-h" id="xl-ea-' + eSlug + '">Related Articles</h2>'
              + '<div class="xl-div" aria-hidden="true"></div>'
              + '<div class="xl-grid" role="list">' + artPool.map(artCard).join('') + '</div>'
              + '<a href="/news" class="xl-more">All Articles \u2192</a>'
              + '</div></section>'
            );
          }
        }

        // ── Strategy card in existing aside ────────────────────────────────
        var aside = document.querySelector('main aside');
        if (aside && !alreadyInjected('xl-evt-strat-card')) {
          var stratArts = fantasyArts(arts, null).slice(0, 3);
          if (stratArts.length) {
            var card = document.createElement('div');
            card.id = 'xl-evt-strat-card';
            card.style.cssText = 'background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:var(--radius-lg,10px);overflow:hidden;margin-top:0;';
            card.innerHTML = '<div style="padding:14px 18px;border-bottom:1px solid rgba(201,168,76,.1);">'
              + '<p style="font-family:var(--font-display);font-size:.95rem;font-weight:700;color:var(--white);">Strategy Articles</p>'
              + '</div>'
              + '<div style="padding:8px 0;">'
              + stratArts.map(function(a) {
                  return '<a href="/news/' + a.slug + '" '
                    + 'style="display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--cream-dim);'
                    + 'padding:9px 18px;border-bottom:1px solid rgba(201,168,76,.06);transition:color .2s;" '
                    + 'onmouseover="this.style.color=\'var(--gold)\'" '
                    + 'onmouseout="this.style.color=\'var(--cream-dim)\'">→ ' + a.title + '</a>';
                }).join('')
              + '</div>';
            aside.appendChild(card);
          }
        }
      });
  }

  // ─── Router ────────────────────────────────────────────────────────────────
  function init() {
    var body = document.body;
    var pt   = body && body.dataset && body.dataset.pageType;
    if (!pt) return;
    injectStyles();
    switch (pt) {
      case 'rider_profile':   handleRider(body);      break;
      case 'article':         handleArticle(body);    break;
      case 'discipline_page': handleDiscipline(body); break;
      case 'events_page':     handleEvent(body);      break;
    }
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
