#!/usr/bin/env python3
"""
generate_cross_links.py — Fantasy Run For A Million
Statically bakes cross-link sections into HTML pages at build time.
Idempotent: uses element ID guards; safe to re-run any time data changes.

Pages handled:
  riders/{disc}/{slug}/index.html   → sidebar cards + related articles section
  news/{slug}/index.html            → discipline guides sidebar card
  disciplines/{disc}/index.html     → events section + strategy sidebar card
  events/{slug}/index.html          → riders section + articles section

Run this script whenever data/*.json changes to refresh static cross-links.
Then commit & push the outputs to GitHub → Cloudflare auto-deploys.
"""

import os, json, re, base64, time, urllib.request, urllib.error

# ── Config ─────────────────────────────────────────────────────────────────
TOKEN     = os.environ.get("GITHUB_TOKEN", "")  # set via env or .env file
REPO      = "aiagent322/fantasyrunforamillion"
API       = "https://api.github.com"
COMMITTER = {"name": "Rex Wager", "email": "rexwager@aol.com"}
HEADERS   = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "frfam-crosslinks-generator"
}
MAX_ARTICLES = 3
MAX_EVENTS   = 3
MAX_RIDERS   = 6

# ── Shared xl-* CSS block (embedded in pages; prevents FOUC) ───────────────
XL_CSS = """  <style id="xlink-css">
    .xl-sect{padding:48px 0;border-top:1px solid rgba(201,168,76,.08);}
    .xl-sect.xl-alt{background:var(--dark-mid);}
    .xl-label{font-size:.7rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;display:block;}
    .xl-h{font-family:var(--font-display,'Playfair Display',Georgia,serif);font-size:clamp(1.2rem,2.5vw,1.7rem);font-weight:700;color:var(--white);margin-bottom:8px;}
    .xl-div{width:28px;height:2px;background:var(--gold);margin:10px 0 24px;}
    .xl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;}
    .xl-card{background:var(--dark-mid);border:1px solid rgba(201,168,76,.12);border-radius:10px;padding:20px 18px;display:flex;flex-direction:column;gap:8px;}
    .xl-cat{font-size:.64rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);opacity:.75;}
    .xl-title{font-size:.9rem;font-weight:600;color:var(--white);line-height:1.35;flex:1;}
    .xl-excerpt{font-size:.8rem;color:var(--cream-dim);opacity:.7;line-height:1.5;margin:0;}
    .xl-link{font-size:.78rem;font-weight:600;color:var(--gold);display:inline-flex;align-items:center;gap:5px;padding-top:6px;margin-top:auto;}
    .xl-link::after{content:"→";}
    .xl-more{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-top:20px;}
    @media(max-width:600px){.xl-grid{grid-template-columns:1fr;}}
  </style>"""

# ── GitHub helpers ─────────────────────────────────────────────────────────
def gh_request(path, method="GET", body=None):
    url  = f"{API}{path}"
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, e.read().decode()[:200]

def get_file(path):
    d, err = gh_request(f"/repos/{REPO}/contents/{path}")
    if err or not d:
        return None, None
    sha     = d["sha"]
    content = base64.b64decode(d["content"]).decode("utf-8")
    return sha, content

def push_file(path, content, sha, message):
    body = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode(),
        "sha": sha,
        "committer": COMMITTER
    }
    _, err = gh_request(f"/repos/{REPO}/contents/{path}", method="PUT", body=body)
    if err:
        print(f"  ✗ push failed {path}: {err[:80]}")
        return False
    return True

def get_raw(path):
    url = f"https://raw.githubusercontent.com/{REPO}/main/{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "frfam"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.read().decode("utf-8")
    except:
        return None

def get_repo_tree():
    d, _ = gh_request(f"/repos/{REPO}/git/trees/main?recursive=1")
    return [i["path"] for i in (d["tree"] if d else []) if i["type"] == "blob"]

# ── Data loading ───────────────────────────────────────────────────────────
def load_data():
    riders_raw   = json.loads(get_raw("data/riders.json") or "{}")
    articles_raw = json.loads(get_raw("data/articles.json") or "{}")
    events_raw   = json.loads(get_raw("data/events.json") or "{}")
    riders   = riders_raw.get("riders", [])
    articles = articles_raw.get("placeholder_articles", [])
    events   = events_raw.get("events", [])
    return riders, articles, events

# ── Matchers ──────────────────────────────────────────────────────────────
def uniq(lst):
    seen, out = set(), []
    for x in lst:
        if x.get("slug") and x["slug"] not in seen:
            seen.add(x["slug"])
            out.append(x)
    return out

def by_rider(arts, rider_slug, exclude=None):
    return [a for a in arts if a.get("slug") != exclude and rider_slug in a.get("rider_references", [])]

def by_disc(arts, disc, exclude=None):
    return [a for a in arts if a.get("slug") != exclude and (a.get("discipline") == disc or a.get("category") == disc)]

def by_cat(arts, cat, exclude=None):
    return [a for a in arts if a.get("slug") != exclude and a.get("category") == cat]

def fantasy_arts(arts, exclude=None):
    return [a for a in arts if a.get("slug") != exclude and a.get("category") in ("fantasy-tips", "rider-profiles")]

def events_by_disc(evts, disc):
    return [e for e in evts if disc in e.get("disciplines", [])]

def riders_by_disc(rids, disc):
    return [r for r in rids if r.get("discipline") == disc and r.get("profiled") and r.get("profile_url")]

# ── Label maps ────────────────────────────────────────────────────────────
DISC_LABELS = {"reining": "Reining", "cow-horse": "Cow Horse", "cutting": "Cutting"}
CAT_LABELS  = {
    "reining": "Reining", "cow-horse": "Cow Horse", "cutting": "Cutting",
    "fantasy-tips": "Fantasy Strategy", "event-coverage": "Event Coverage",
    "rider-profiles": "Rider Spotlight", "western-sports": "Western Sports"
}
def disc_label(d): return DISC_LABELS.get(d, d)
def cat_label(c):  return CAT_LABELS.get(c, c)

# ── HTML builders ──────────────────────────────────────────────────────────
def art_card(a):
    excerpt = (a.get("excerpt") or "")[:115]
    if len(a.get("excerpt") or "") > 115: excerpt += "…"
    cat  = cat_label(a.get("category", ""))
    slug = a["slug"]
    return (f'<div class="xl-card">'
            f'<p class="xl-cat">{cat}</p>'
            f'<p class="xl-title">{a["title"]}</p>'
            + (f'<p class="xl-excerpt">{excerpt}</p>' if excerpt else "")
            + f'<a href="/news/{slug}" class="xl-link">Read Article</a>'
            + '</div>')

def rider_card(r):
    excerpt = f'<p class="xl-excerpt">📍 {r["hometown"]}</p>' if r.get("hometown") else ""
    return (f'<div class="xl-card">'
            f'<p class="xl-cat">{disc_label(r["discipline"])}</p>'
            f'<p class="xl-title">{r["name"]}</p>'
            + excerpt
            + f'<a href="{r["profile_url"]}" class="xl-link">Fantasy Profile</a>'
            + '</div>')

def event_card(e):
    discs   = " · ".join(disc_label(d) for d in e.get("disciplines", []))
    yr      = f' {e["year"]}' if e.get("year") else ""
    purse   = (f'<p class="xl-excerpt" style="color:var(--gold);opacity:.85;font-weight:600;">'
               f'Purse: {e["purse_display"]}</p>') if e.get("purse_display") else ""
    return (f'<div class="xl-card">'
            f'<p class="xl-cat">{discs}</p>'
            f'<p class="xl-title">{e["name"]}{yr}</p>'
            + purse
            + f'<a href="{e["page_url"]}" class="xl-link">Event Overview</a>'
            + '</div>')

def xl_section(sect_id, label, heading, heading_id, cards, view_all_url=None,
               view_all_label="See All", alt=False):
    alt_class = " xl-alt" if alt else ""
    view_all  = f'\n    <a href="{view_all_url}" class="xl-more">{view_all_label} →</a>' if view_all_url else ""
    return (f'\n  <section id="{sect_id}" class="xl-sect{alt_class}" aria-labelledby="{heading_id}">'
            f'\n    <div class="container">'
            f'\n      <span class="xl-label">{label}</span>'
            f'\n      <h2 class="xl-h" id="{heading_id}">{heading}</h2>'
            f'\n      <div class="xl-div" aria-hidden="true"></div>'
            f'\n      <div class="xl-grid" role="list">{cards}</div>'
            + view_all
            + '\n    </div>'
            + '\n  </section>')

def rider_links_card(card_id, title, links, aria=""):
    aria_attr = f' aria-label="{aria}"' if aria else ""
    items = "\n              ".join(
        f'<a href="{url}" class="sidebar-link">{label}</a>' for url, label in links
    )
    return (f'\n            <div class="links-card" id="{card_id}"{aria_attr}>'
            f'\n              <p class="links-card-title">{title}</p>'
            f'\n              {items}'
            f'\n            </div>')

def article_sidebar_card(card_id, title, links):
    items = "\n            ".join(
        f'<a href="{url}" class="related-link-item">{label}</a>' for url, label in links
    )
    return (f'\n            <div class="sidebar-card" id="{card_id}">'
            f'\n              <div class="sidebar-card-title">{title}</div>'
            f'\n              <div class="related-links-list">'
            f'\n            {items}'
            f'\n              </div>'
            f'\n            </div>')

def disc_sidebar_card(card_id, title, links):
    items = "\n            ".join(
        f'<a href="{url}" class="sidebar-link">{label}</a>' for url, label in links
    )
    return (f'\n            <div class="sidebar-card" id="{card_id}">'
            f'\n              <div class="sidebar-card-header"><p class="sidebar-card-title">{title}</p></div>'
            f'\n              <div class="sidebar-links">'
            f'\n            {items}'
            f'\n              </div>'
            f'\n            </div>')

# ── CSS injection ──────────────────────────────────────────────────────────
def inject_xl_css(html):
    if 'id="xlink-css"' in html:
        return html
    return html.replace("</head>", XL_CSS + "\n</head>", 1)

# ── Page-specific patchers ─────────────────────────────────────────────────

def patch_rider_page(html, rider_slug, discipline, riders, articles, events):
    """
    Injects:
      1. xl-css into <head>
      2. Sidebar: strategy articles card (links-card style)
      3. Sidebar: related events card (links-card style)
      4. Related articles section (xl-* style) before <!-- Related Riders -->
    """
    changed = False

    # ── 1. xl-css ────────────────────────────────────────────────────────
    if 'id="xlink-css"' not in html:
        html    = inject_xl_css(html)
        changed = True

    # ── 2 & 3. Sidebar cards ─────────────────────────────────────────────
    sidebar_injection = ""

    if 'id="xl-rider-arts-card"' not in html:
        art_pool = uniq(by_rider(articles, rider_slug) + by_disc(articles, discipline)
                        + fantasy_arts(articles))[:4]
        if art_pool:
            sidebar_injection += rider_links_card(
                "xl-rider-arts-card", "Strategy Articles",
                [(f'/news/{a["slug"]}', a["title"]) for a in art_pool],
                aria="Related strategy articles"
            )

    if 'id="xl-rider-evts-card"' not in html:
        disc_evts = events_by_disc(events, discipline)[:MAX_EVENTS]
        if disc_evts:
            evt_links = [(e["page_url"], e["name"]) for e in disc_evts]
            evt_links.append(("/events", "All Events"))
            sidebar_injection += rider_links_card(
                "xl-rider-evts-card", "Related Events", evt_links
            )

    if sidebar_injection:
        # Inject before </aside> (there is exactly one on rider pages)
        aside_close = "</aside>"
        pos = html.find(aside_close)
        if pos != -1:
            html    = html[:pos] + sidebar_injection + "\n          " + html[pos:]
            changed = True

    # ── 4. Related articles section ────────────────────────────────────
    if 'id="xl-rider-arts-sect"' not in html:
        pool = uniq(by_rider(articles, rider_slug) + by_disc(articles, discipline)
                    + fantasy_arts(articles))[:MAX_ARTICLES]
        if pool:
            cards     = "".join(art_card(a) for a in pool)
            view_more = ('\n      <div style="margin-top:24px;">'
                         '<a href="/news" style="display:inline-flex;align-items:center;gap:8px;'
                         'font-size:0.82rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;'
                         'color:var(--gold);">All Articles →</a></div>')
            sect = (f'\n    <section id="xl-rider-arts-sect" '
                    f'class="related-section content-section alt" '
                    f'aria-labelledby="xl-ra-{rider_slug}">'
                    f'\n      <div class="container">'
                    f'\n        <p class="section-label">Fantasy Strategy &amp; Analysis</p>'
                    f'\n        <h2 class="section-title" id="xl-ra-{rider_slug}">Related Articles</h2>'
                    f'\n        <div class="divider" aria-hidden="true"></div>'
                    f'\n        <div class="xl-grid" role="list">{cards}</div>'
                    + view_more
                    + '\n      </div>'
                    + '\n    </section>')
            # Inject before <!-- Related Riders --> comment or before related-section
            marker = "<!-- Related Riders -->"
            if marker in html:
                html    = html.replace(marker, sect + "\n\n    " + marker, 1)
                changed = True
            else:
                # Fallback: before <section class="related-section"
                m = html.find('<section class="related-section')
                if m != -1:
                    html    = html[:m] + sect + "\n    " + html[m:]
                    changed = True

    return html if changed else None


def patch_article_page(html, article_data, articles, events):
    """
    Injects discipline guides sidebar card into article sidebar.
    Skips if sidebar already contains /disciplines/ links (no duplicate).
    """
    changed = False
    disc    = article_data.get("discipline")
    cat     = article_data.get("category", "")
    slug    = article_data.get("slug", "")

    if 'id="xl-art-disc-card"' in html:
        return None  # already patched

    # Build discipline links
    d_links = []
    specific = disc or (cat if cat in DISC_LABELS else None)
    if specific:
        d_links = [
            (f"/disciplines/{specific}", f"{disc_label(specific)} Discipline Guide"),
            (f"/riders/{specific}",      f"{disc_label(specific)} Riders"),
        ]
    else:
        # Cross-discipline: link all 3 discipline guides
        for d in ("reining", "cow-horse", "cutting"):
            d_links.append((f"/disciplines/{d}", f"{disc_label(d)} Discipline Guide"))

    if not d_links:
        return None

    # Skip injection if sidebar already has discipline links (avoid duplicate)
    aside_start = html.find('<aside class="article-sidebar"')
    aside_end   = html.find("</aside>", aside_start) if aside_start != -1 else -1
    if aside_start != -1 and aside_end != -1:
        aside_html = html[aside_start:aside_end]
        if "/disciplines/" in aside_html:
            return None  # already cross-linked to disciplines

    card = article_sidebar_card("xl-art-disc-card", "Discipline Guides", d_links)

    # Inject before </aside>
    pos = html.find("</aside>") if aside_start == -1 else html.find("</aside>", aside_start)
    if pos != -1:
        html    = html[:pos] + card + "\n          " + html[pos:]
        changed = True

    return html if changed else None


def patch_discipline_page(html, discipline, articles, events):
    """
    Injects:
      1. xl-css into <head>
      2. Strategy articles card into .disc-sidebar
      3. Related events section before </main>
    """
    changed = False

    if 'id="xlink-css"' not in html:
        html    = inject_xl_css(html)
        changed = True

    # ── Strategy articles sidebar ─────────────────────────────────────────
    if 'id="xl-disc-strat-card"' not in html:
        strat = uniq(by_disc(articles, discipline) + fantasy_arts(articles))[:3]
        if strat:
            card = disc_sidebar_card(
                "xl-disc-strat-card", "Strategy Articles",
                [(f'/news/{a["slug"]}', a["title"]) for a in strat]
            )
            # Inject before </aside> in the disc-sidebar
            disc_sb_start = html.find('class="disc-sidebar"')
            if disc_sb_start != -1:
                aside_close_pos = html.find("</aside>", disc_sb_start)
                if aside_close_pos != -1:
                    html    = html[:aside_close_pos] + card + "\n          " + html[aside_close_pos:]
                    changed = True

    # ── Related events section ────────────────────────────────────────────
    if 'id="xl-disc-evts-sect"' not in html:
        disc_evts = events_by_disc(events, discipline)
        if disc_evts:
            cards = "".join(event_card(e) for e in disc_evts)
            sect  = xl_section(
                f"xl-disc-evts-sect",
                "Upcoming Competition",
                "Related Events",
                f"xl-de-{discipline}",
                cards
            )
            main_close = html.rfind("</main>")
            if main_close != -1:
                html    = html[:main_close] + sect + "\n  " + html[main_close:]
                changed = True

    return html if changed else None


def patch_event_page(html, event_data, riders, articles):
    """
    Injects:
      1. xl-css into <head>
      2. Eligible riders section before </main>
      3. Related articles section before </main>
    """
    changed   = False
    event_slug = event_data.get("slug", "")
    discs      = event_data.get("disciplines", ["reining", "cow-horse", "cutting"])

    if 'id="xlink-css"' not in html:
        html    = inject_xl_css(html)
        changed = True

    # ── Riders section ────────────────────────────────────────────────────
    if 'id="xl-evt-riders-sect"' not in html:
        elig = [r for r in riders
                if r.get("discipline") in discs and r.get("profiled") and r.get("profile_url")]
        elig = elig[:MAX_RIDERS]
        if elig:
            cards = "".join(rider_card(r) for r in elig)
            sect  = xl_section(
                "xl-evt-riders-sect", "Fantasy Game", "Eligible Riders",
                f"xl-er-{event_slug}", cards, "/riders", "All Riders", alt=True
            )
            main_close = html.rfind("</main>")
            if main_close != -1:
                html    = html[:main_close] + sect + "\n  " + html[main_close:]
                changed = True

    # ── Articles section ──────────────────────────────────────────────────
    if 'id="xl-evt-arts-sect"' not in html:
        art_pool = uniq(
            [a for a in articles if event_slug in a.get("event_references", [])]
            + fantasy_arts(articles)
            + sum((by_disc(articles, d) for d in discs), [])
        )[:MAX_ARTICLES]
        if art_pool:
            cards = "".join(art_card(a) for a in art_pool)
            sect  = xl_section(
                "xl-evt-arts-sect", "Fantasy Strategy", "Related Articles",
                f"xl-ea-{event_slug}", cards, "/news", "All Articles"
            )
            main_close = html.rfind("</main>")
            if main_close != -1:
                html    = html[:main_close] + sect + "\n  " + html[main_close:]
                changed = True

    return html if changed else None


# ── Main ──────────────────────────────────────────────────────────────────
def main():
    print("Loading data...")
    riders, articles, events = load_data()
    art_by_slug = {a["slug"]: a for a in articles}
    evt_by_slug = {e["slug"]: e for e in events}
    evt_by_id   = {e["id"]: e   for e in events}
    print(f"  Riders: {len(riders)} | Articles: {len(articles)} | Events: {len(events)}")

    print("\nFetching repo tree...")
    all_paths = get_repo_tree()
    print(f"  Total files: {len(all_paths)}")

    stats = {"patched": 0, "skipped": 0, "failed": 0}

    for path in all_paths:
        if not path.endswith(".html") or path.startswith("admin/"):
            continue

        patch_fn   = None
        patch_args = None

        # ── Rider profile page ─────────────────────────────────────────
        m = re.match(r"riders/([^/]+)/([^/]+)/index\.html$", path)
        if m:
            discipline, rider_slug = m.group(1), m.group(2)
            patch_fn   = patch_rider_page
            patch_args = (rider_slug, discipline, riders, articles, events)

        # ── Article page (not category hub) ───────────────────────────
        if patch_fn is None:
            m = re.match(r"news/([^/]+)/index\.html$", path)
            if m and m.group(1) not in ("reining", "cow-horse", "cutting"):
                article_slug = m.group(1)
                art_data     = art_by_slug.get(article_slug)
                if art_data:
                    patch_fn   = patch_article_page
                    patch_args = (art_data, articles, events)

        # ── Discipline page ────────────────────────────────────────────
        if patch_fn is None:
            m = re.match(r"disciplines/([^/]+)/index\.html$", path)
            if m:
                patch_fn   = patch_discipline_page
                patch_args = (m.group(1), articles, events)

        # ── Event page (not hub) ───────────────────────────────────────
        if patch_fn is None:
            m = re.match(r"events/([^/]+)/index\.html$", path)
            if m and path != "events/index.html":
                event_slug = m.group(1)
                evt_data   = evt_by_slug.get(event_slug) or next(
                    (e for e in events if e["id"].startswith(event_slug)), None
                )
                if evt_data:
                    patch_fn   = patch_event_page
                    patch_args = (evt_data, riders, articles)

        if patch_fn is None:
            continue

        # Get current HTML
        sha, html = get_file(path)
        if not sha:
            print(f"  ✗ GET failed: {path}")
            stats["failed"] += 1
            time.sleep(0.2)
            continue

        # Apply patch
        patched = patch_fn(html, *patch_args)
        if patched is None:
            print(f"  – already done: {path}")
            stats["skipped"] += 1
            continue

        # Push
        ok = push_file(path, patched, sha, f"feat(cross-links): static injection — {path}")
        if ok:
            print(f"  ✓ {path}")
            stats["patched"] += 1
        else:
            stats["failed"] += 1

        time.sleep(0.45)

    print(f"\n── Results ────────────────────────────────")
    print(f"  Patched : {stats['patched']}")
    print(f"  Skipped : {stats['skipped']} (already done)")
    print(f"  Failed  : {stats['failed']}")


if __name__ == "__main__":
    main()
