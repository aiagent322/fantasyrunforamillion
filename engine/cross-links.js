/*!
 * Fantasy Run For A Million — Cross-Link Engine  v2.0
 * /engine/cross-links.js
 *
 * Automatically injects contextual related-content blocks by page type.
 * Data sourced from /data/riders.json, /data/articles.json, /data/events.json.
 * Idempotent: checks element IDs before injecting; safe alongside static baked content.
 * All fetches cached in-memory for the page session.
 *
 * v2.0 changes:
 *   - Fixed sidebarCard() ID placement bug (ID now on root element, not wrapper)
 *   - Added "Discipline Guides" sidebar injection for article pages
 *   - Consistent ID guards across all injection points
 *   - Article discipline detection from body data-article-discipline attr (if set)
 *     or falls back to JSON lookup
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
      if (!a || !a.slug || seen[a.slug]) return false;
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
  function profiledRiders(rids, disc, exclude) {
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

  // ─── Discipline link builder for articles ──────────────────────────────────
  function discLinksForArticle(disc, cat, riderRefs, rids) {
    var specific = disc || (cat !== 'fantasy-tips' && cat !== 'western-sports' && cat !== 'event-coverage' && cat !== 'rider-profiles' ? cat : null);
    if (specific && ['reining', 'cow-horse', 'cutting'].indexOf(specific) !== -1) {
      return [
        { url: '/disciplines/' + specific, label: discLabel(specific) + ' Discipline Guide' },
        { url: '/riders/' + specific, label: discLabel(specific) + ' Riders' }
      ];
    }
    // Cross-discipline: infer from rider references, then default all 3
    var refDiscs = [];
    if (riderRefs && riderRefs.length && rids && rids.length) {
      riderRefs.forEach(function(slug) {
        var r = rids.filter(function(x){ return x.slug === slug; })[0];
        if (r && refDiscs.indexOf(r.discipline) === -1) refDiscs.push(r.discipline);
      });
    }
    var targets = refDiscs.length ? refDiscs : ['reining', 'cow-horse', 'cutting'];
    return targets.slice(0, 3).map(function(d) {
      return { url: '/disciplines/' + d, label: discLabel(d) + ' Discipline Guide' };
    });
  }

  // ─── Shared CSS (injected once; skipped if static page already has xlink-css) ──
  function injectStyles() {
    if (document.getElementById('xlink-css')) return;
    var s = document.createElement('style');
    s.id = 'xlink-css';
    s.textContent = [
      '.xl-sect{padding:48px 0;border-top:1px solid rgba(201,168,76,.08);}',
      '.xl-sect.xl-alt{background:var(--dark-mid);}',
      '.xl-label{font-size:.7rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;display:block;}',
      '.xl-h{font-family:var(--font-display,"Playfair Display",Georgia,serif);font-size:clamp(1.2rem,2.5vw,1.7rem);font-weight:700;color:var(--white);margin-bottom:8px;}',
      '.xl-div{width:28px;height:2px;background:var(--gold);margin:10px 0 24px;}',
      '.xl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;}',
      '.xl-card{background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:10px;padding:20px 18px;display:flex;flex-direction:column;gap:8px;}',
      '.xl-cat{font-size:.64rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);opacity:.75;}',
      '.xl-title{font-size:.9rem;font-weight:600;color:var(--white);line-height:1.35;flex:1;}',
      '.xl-excerpt{font-size:.8rem;color:var(--cream-dim);opacity:.7;line-height:1.5;margin:0;}',
      '.xl-link{font-size:.78rem;font-weight:600;color:var(--gold);display:inline-flex;align-items:center;gap:5px;padding-top:6px;margin-top:auto;}',
      '.xl-link::after{content:"\u2192";}',
      '.xl-more{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-top:20px;}',
      '.xl-sc{background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:var(--radius-lg,10px);padding:18px 20px;display:flex;flex-direction:column;gap:6px;}',
      '.xl-sc-title{font-size:.68rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);opacity:.7;margin-bottom:4px;}',
      '.xl-sc-link{display:flex;align-items:center;gap:8px;font-size:.83rem;color:var(--cream-dim);padding:7px 0;border-bottom:1px solid rgba(201,168,76,.07);transition:color .2s;}',
      '.xl-sc-link:last-child{border-bottom:none;}',
      '.xl-sc-link:hover{color:var(--gold);}',
      '.xl-sc-link::before{content:"\u2192";font-size:.7rem;color:var(--gold);opacity:.5;}',
      '@media(max-width:600px){.xl-grid{grid-template-columns:1fr;}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ─── HTML builders ─────────────────────────────────────────────────────────
  // FIXED: id is now placed on the root element (not a discarded wrapper)
  function sidebarCard(title, links, id) {
    return '<div class="xl-sc"' + (id ? ' id="' + id + '"' : '') + '>'
      + '<p class="xl-sc-title">' + title + '</p>'
      + links.map(function(l) {
          return '<a href="' + l.url + '" class="xl-sc-link">' + l.label + '</a>';
        }).join('')
      + '</div>';
  }

  // Article sidebar card using existing article page CSS classes
  function articleSidebarCard(title, links, id) {
    return '<div class="sidebar-card"' + (id ? ' id="' + id + '"' : '') + '>'
      + '<div class="sidebar-card-title">' + title + '</div>'
      + '<div class="related-links-list">'
      + links.map(function(l) {
          return '<a href="' + l.url + '" class="related-link-item">' + l.label + '</a>';
        }).join('')
      + '</div></div>';
  }

  // Disc sidebar card (discipline page sidebar CSS)
  function discSidebarCard(title, links, id) {
    return '<div class="sidebar-card"' + (id ? ' id="' + id + '"' : '') + '>'
      + '<div class="sidebar-card-header"><p class="sidebar-card-title">' + title + '</p></div>'
      + '<div class="sidebar-links">'
      + links.map(function(l) {
          return '<a href="' + l.url + '" class="sidebar-link">' + l.label + '</a>';
        }).join('')
      + '</div></div>';
  }

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

  function xlSection(id, label, heading, headingId, cardsHtml, viewAllUrl, viewAllLabel, alt) {
    return '<section id="' + id + '" class="xl-sect' + (alt ? ' xl-alt' : '') + '" aria-labelledby="' + headingId + '">'
      + '<div class="container">'
      + '<span class="xl-label">' + label + '</span>'
      + '<h2 class="xl-h" id="' + headingId + '">' + heading + '</h2>'
      + '<div class="xl-div" aria-hidden="true"></div>'
      + '<div class="xl-grid" role="list">' + cardsHtml + '</div>'
      + (viewAllUrl ? '<a href="' + viewAllUrl + '" class="xl-more">' + viewAllLabel + ' \u2192</a>' : '')
      + '</div></section>';
  }

  // ─── DOM helpers ───────────────────────────────────────────────────────────
  function insertBefore(refEl, html) {
    if (!refEl) return;
    var t = document.createElement('template');
    if (t.content !== undefined) {
      t.innerHTML = html;
      refEl.parentNode.insertBefore(t.content.firstElementChild, refEl);
    } else {
      var w = document.createElement('div');
      w.innerHTML = html;
      refEl.parentNode.insertBefore(w.firstElementChild, refEl);
    }
  }

  function appendTo(parent, html) {
    if (!parent) return;
    var t = document.createElement('template');
    if (t.content !== undefined) {
      t.innerHTML = html;
      parent.appendChild(t.content.firstElementChild);
    } else {
      var w = document.createElement('div');
      w.innerHTML = html;
      parent.appendChild(w.firstElementChild);
    }
  }

  function alreadyInjected(id) { return !!document.getElementById(id); }

  // ─── RIDER PROFILE ─────────────────────────────────────────────────────────
  function handleRider(body) {
    var rSlug = body.dataset.riderSlug;
    var disc  = body.dataset.riderDiscipline;
    if (!rSlug || !disc) return;

    Promise.all([getRiders(), getArticles(), getEvents()])
      .then(function(res) {
        var rids = res[0], arts = res[1], evts = res[2];
        var sidebar = document.querySelector('.sidebar-col');

        // ── Sidebar: strategy articles ─────────────────────────────────────
        if (sidebar && !alreadyInjected('xl-rider-arts-card')) {
          var rArts = uniq(byRider(arts, rSlug, null)).slice(0, 4);
          if (rArts.length) {
            appendTo(sidebar, sidebarCard('Strategy Articles',
              rArts.map(function(a) { return { url: '/news/' + a.slug, label: a.title }; }),
              'xl-rider-arts-card'
            ));
          }
        }

        // ── Sidebar: related events ────────────────────────────────────────
        if (sidebar && !alreadyInjected('xl-rider-evts-card')) {
          var discEvts = eventsByDisc(evts, disc).slice(0, MAX.events);
          if (discEvts.length) {
            var evtLinks = discEvts.map(function(e) { return { url: e.page_url, label: e.name }; });
            evtLinks.push({ url: '/events', label: 'All Events' });
            appendTo(sidebar, sidebarCard('Related Events', evtLinks, 'xl-rider-evts-card'));
          }
        }

        // ── Section: related articles before .back-nav ─────────────────────
        var backNav = document.querySelector('.back-nav');
        if (backNav && !alreadyInjected('xl-rider-arts-sect')) {
          var pool = uniq(
            byRider(arts, rSlug, null)
              .concat(byDisc(arts, disc, null))
              .concat(fantasyArts(arts, null))
          ).slice(0, MAX.articles);
          if (pool.length) {
            insertBefore(backNav, xlSection(
              'xl-rider-arts-sect',
              'Fantasy Strategy &amp; Analysis',
              'Related Articles',
              'xl-ra-' + rSlug,
              pool.map(artCard).join(''),
              '/news', 'All Articles', true
            ));
          }
        }
      });
  }

  // ─── ARTICLE ───────────────────────────────────────────────────────────────
  function handleArticle(body) {
    var slug = body.dataset.articleSlug;
    var cat  = body.dataset.articleCategory;
    if (!slug) return;

    Promise.all([getRiders(), getArticles(), getEvents()])
      .then(function(res) {
        var rids = res[0], arts = res[1], evts = res[2];
        var thisArt = null;
        for (var i = 0; i < arts.length; i++) {
          if (arts[i].slug === slug) { thisArt = arts[i]; break; }
        }
        var disc  = thisArt ? (thisArt.discipline || null) : null;
        var rRefs = thisArt ? (thisArt.rider_references || []) : [];
        var sidebar = document.querySelector('.article-sidebar');

        // ── Sidebar: discipline guides ─────────────────────────────────────
        if (sidebar && !alreadyInjected('xl-art-disc-card')) {
          // Skip if page already has /disciplines/ links (avoids duplicate)
          var hasDisciplineLinks = sidebar.innerHTML.indexOf('/disciplines/') !== -1;
          if (!hasDisciplineLinks) {
            var dLinks = discLinksForArticle(disc, cat, rRefs, rids);
            if (dLinks.length) {
              appendTo(sidebar, articleSidebarCard('Discipline Guides', dLinks, 'xl-art-disc-card'));
            }
          }
        }

        // ── Sidebar: related events ────────────────────────────────────────
        if (sidebar && !alreadyInjected('xl-art-evts-card')) {
          var relEvts = disc
            ? eventsByDisc(evts, disc).slice(0, MAX.events)
            : evts.filter(function(e) { return e.is_fantasy_anchor; }).slice(0, 2);
          if (relEvts.length) {
            var eLinks = relEvts.map(function(e) { return { url: e.page_url, label: e.name }; });
            eLinks.push({ url: '/events', label: 'All Events' });
            appendTo(sidebar, articleSidebarCard('Related Events', eLinks, 'xl-art-evts-card'));
          }
        }

        // ── Sidebar: fantasy tools (skip if this is already a fantasy-tips article) ─
        if (sidebar && cat !== 'fantasy-tips' && !alreadyInjected('xl-art-tools-card')) {
          appendTo(sidebar, articleSidebarCard('Fantasy Tools', [
            { url: '/pick-your-team', label: 'Build Your Team' },
            { url: '/strategy', label: 'Strategy Hub' },
            { url: '/scoring-rules', label: 'How Scoring Works' },
            { url: '/leaderboard', label: 'Fantasy Leaderboard' },
            { url: '/top-riders', label: 'Top Riders by Discipline' }
          ], 'xl-art-tools-card'));
        }

        // ── Related articles: smarter pool (replace static 3) ──────────────
        var artCards = document.querySelector('.related-articles .article-cards');
        if (artCards && !alreadyInjected('xl-art-rel-enhanced')) {
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
            // Add sentinel so we don't re-enhance
            var sentinel = document.createElement('span');
            sentinel.id = 'xl-art-rel-enhanced';
            sentinel.hidden = true;
            artCards.appendChild(sentinel);
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

  // ─── DISCIPLINE PAGE ───────────────────────────────────────────────────────
  function handleDiscipline(body) {
    var disc = body.dataset.discipline;
    if (!disc) return;

    Promise.all([getArticles(), getEvents()])
      .then(function(res) {
        var arts = res[0], evts = res[1];

        // ── Augment article strip with additional articles ─────────────────
        var artStrip = document.querySelector('.disc-article-cards');
        if (artStrip) {
          var shownSlugs = Array.from(artStrip.querySelectorAll('a.disc-article-card')).map(function(el) {
            return (el.getAttribute('href') || '').split('/').pop();
          });
          var extra = uniq(byDisc(arts, disc, null).concat(fantasyArts(arts, null)))
            .filter(function(a) { return shownSlugs.indexOf(a.slug) === -1; })
            .slice(0, 2);
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

        // ── Sidebar: strategy articles card ───────────────────────────────
        var discSidebar = document.querySelector('.disc-sidebar');
        if (discSidebar && !alreadyInjected('xl-disc-strat-card')) {
          var stratArts = uniq(byDisc(arts, disc, null).concat(fantasyArts(arts, null))).slice(0, 3);
          if (stratArts.length) {
            appendTo(discSidebar, discSidebarCard('Strategy Articles',
              stratArts.map(function(a) { return { url: '/news/' + a.slug, label: a.title }; }),
              'xl-disc-strat-card'
            ));
          }
        }

        // ── Section: related events appended to main ───────────────────────
        var mainEl = document.querySelector('main');
        if (mainEl && !alreadyInjected('xl-disc-evts-sect')) {
          var discEvts = eventsByDisc(evts, disc);
          if (discEvts.length) {
            appendTo(mainEl, xlSection(
              'xl-disc-evts-sect',
              'Upcoming Competition',
              'Related Events',
              'xl-de-' + disc,
              discEvts.map(function(e) {
                var discs = (e.disciplines || []).map(discLabel).join(' \u00b7 ');
                return '<div class="xl-card">'
                  + '<p class="xl-cat">' + discs + '</p>'
                  + '<p class="xl-title">' + e.name + (e.year ? ' ' + e.year : '') + '</p>'
                  + (e.purse_display ? '<p class="xl-excerpt" style="color:var(--gold);opacity:.85;font-weight:600;">Purse: ' + e.purse_display + '</p>' : '')
                  + '<a href="' + e.page_url + '" class="xl-link">Event Overview</a>'
                  + '</div>';
              }).join(''),
              null, null, false
            ));
          }
        }
      });
  }

  // ─── EVENT PAGE ────────────────────────────────────────────────────────────
  function handleEvent(body) {
    var eSlug = body.dataset.eventSlug;
    if (!eSlug) return;

    Promise.all([getRiders(), getArticles(), getEvents()])
      .then(function(res) {
        var rids = res[0], arts = res[1], evts = res[2];
        var thisEvt = evts.filter(function(e) {
          return e.slug === eSlug || e.id.indexOf(eSlug) === 0;
        })[0];
        var discs = thisEvt ? (thisEvt.disciplines || []) : ['reining', 'cow-horse', 'cutting'];
        var mainEl = document.querySelector('main');
        if (!mainEl) return;

        // ── Section: eligible riders ───────────────────────────────────────
        if (!alreadyInjected('xl-evt-riders-sect')) {
          var eligRiders = rids.filter(function(r) {
            return discs.indexOf(r.discipline) !== -1 && r.profiled === true && r.profile_url;
          }).slice(0, MAX.riders);
          if (eligRiders.length) {
            appendTo(mainEl, xlSection(
              'xl-evt-riders-sect', 'Fantasy Game', 'Eligible Riders', 'xl-er-' + eSlug,
              eligRiders.map(function(r) {
                return '<div class="xl-card">'
                  + '<p class="xl-cat">' + discLabel(r.discipline) + '</p>'
                  + '<p class="xl-title">' + r.name + '</p>'
                  + (r.hometown ? '<p class="xl-excerpt">\uD83D\uDCCD ' + r.hometown + '</p>' : '')
                  + '<a href="' + r.profile_url + '" class="xl-link">Fantasy Profile</a>'
                  + '</div>';
              }).join(''),
              '/riders', 'All Riders', true
            ));
          }
        }

        // ── Section: related articles ─────────────────────────────────────
        if (!alreadyInjected('xl-evt-arts-sect')) {
          var artPool = uniq(
            arts.filter(function(a) { return (a.event_references || []).indexOf(eSlug) !== -1; })
              .concat(fantasyArts(arts, null))
              .concat(discs.reduce(function(acc, d) { return acc.concat(byDisc(arts, d, null)); }, []))
          ).slice(0, MAX.articles);
          if (artPool.length) {
            appendTo(mainEl, xlSection(
              'xl-evt-arts-sect', 'Fantasy Strategy', 'Related Articles', 'xl-ea-' + eSlug,
              artPool.map(artCard).join(''),
              '/news', 'All Articles', false
            ));
          }
        }

        // ── Sidebar: strategy articles ────────────────────────────────────
        var aside = document.querySelector('main aside');
        if (aside && !alreadyInjected('xl-evt-strat-card')) {
          var stratArts = fantasyArts(arts, null).slice(0, 3);
          if (stratArts.length) {
            var card = document.createElement('div');
            card.id = 'xl-evt-strat-card';
            card.style.cssText = 'background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:var(--radius-lg,10px);overflow:hidden;';
            card.innerHTML = '<div style="padding:14px 18px;border-bottom:1px solid rgba(201,168,76,.1);">'
              + '<p style="font-family:var(--font-display);font-size:.95rem;font-weight:700;color:var(--white);">Strategy Articles</p></div>'
              + '<div style="padding:8px 0;">'
              + stratArts.map(function(a) {
                  return '<a href="/news/' + a.slug + '" style="display:flex;align-items:center;gap:8px;font-size:.82rem;'
                    + 'color:var(--cream-dim);padding:9px 18px;border-bottom:1px solid rgba(201,168,76,.06);'
                    + 'transition:color .2s;" onmouseover="this.style.color=\'var(--gold)\'" '
                    + 'onmouseout="this.style.color=\'var(--cream-dim)\'">→ ' + a.title + '</a>';
                }).join('')
              + '</div>';
            aside.appendChild(card);
          }
        }
      });
  }


  // ─── CATEGORY HUB (news/reining, news/cow-horse, news/cutting) ────────────
  function handleCategoryHub(body) {
    var cat = body.dataset.category;  // 'reining' | 'cow-horse' | 'cutting' | undefined
    if (!cat) return;                 // news index handled separately

    Promise.all([getRiders(), getArticles(), getEvents()])
      .then(function(res) {
        var rids = res[0], arts = res[1], evts = res[2];
        var mainEl = document.querySelector('main');
        if (!mainEl) return;

        // ── Related riders sidebar card (if sidebar present) ────────────
        var sidebar = document.querySelector('.disc-sidebar, .article-sidebar, aside');
        if (sidebar && !alreadyInjected('xl-hub-riders-card')) {
          var hubRiders = profiledRiders(rids, cat, null).slice(0, 5);
          if (hubRiders.length) {
            var links = hubRiders.map(function(r) {
              return { url: r.profile_url, label: r.name };
            });
            links.push({ url: '/riders/' + cat, label: 'All ' + discLabel(cat) + ' Riders' });
            appendTo(sidebar, sidebarCard('Featured Riders', links, 'xl-hub-riders-card'));
          }
        }

        // ── Related events section ────────────────────────────────────
        if (!alreadyInjected('xl-hub-evts-sect')) {
          var hubEvts = eventsByDisc(evts, cat);
          if (hubEvts.length) {
            appendTo(mainEl, xlSection(
              'xl-hub-evts-sect', 'Upcoming Competition', 'Related Events', 'xl-he-' + cat,
              hubEvts.map(function(e) {
                var discs = (e.disciplines || []).map(discLabel).join(' \u00b7 ');
                return '<div class="xl-card"><p class="xl-cat">' + discs + '</p>'
                  + '<p class="xl-title">' + e.name + (e.year ? ' ' + e.year : '') + '</p>'
                  + (e.purse_display ? '<p class="xl-excerpt" style="color:var(--gold);font-weight:600;">Purse: '
                     + e.purse_display + '</p>' : '')
                  + '<a href="' + e.page_url + '" class="xl-link">Event Overview</a></div>';
              }).join(''),
              null, null, true
            ));
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
      case 'category_hub':   handleCategoryHub(body); break;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
