#!/usr/bin/env python3
"""
Fantasy Run For A Million — Rider Profile Page Generator
Produces one static index.html per rider under the correct route path.
Add riders to RIDERS list; re-run to regenerate all pages.
"""

import os

OUT_BASE = "/mnt/user-data/outputs/riders"

# ── Per-discipline full rosters (for related-riders section) ──────────────────

ALL_REINING = [
    {"name": "Andrea Fappani",      "slug": "andrea-fappani",      "profiled": True},
    {"name": "Casey Deary",         "slug": "casey-deary",         "profiled": True},
    {"name": "Cade McCutcheon",     "slug": "cade-mccutcheon",     "profiled": True},
    {"name": "Jason Vanlandingham", "slug": "jason-vanlandingham", "profiled": False},
    {"name": "Craig Schmersal",     "slug": "craig-schmersal",     "profiled": False},
    {"name": "Kole Price",          "slug": "kole-price",          "profiled": False},
    {"name": "Matt Mills",          "slug": "matt-mills",          "profiled": False},
    {"name": "Nathan Piper",        "slug": "nathan-piper",        "profiled": False},
]

ALL_COWHORSE = [
    {"name": "Corey Cushing",   "slug": "corey-cushing",  "profiled": True},
    {"name": "Boyd Rice",       "slug": "boyd-rice",      "profiled": True},
    {"name": "Chris Dawson",    "slug": "chris-dawson",   "profiled": True},
    {"name": "Abbie Phillips",  "slug": "abbie-phillips", "profiled": False},
    {"name": "Kyle Trahern",    "slug": "kyle-trahern",   "profiled": False},
    {"name": "Clayton Edsall",  "slug": "clayton-edsall", "profiled": False},
    {"name": "Erin Taormino",   "slug": "erin-taormino",  "profiled": False},
    {"name": "Zane Davis",      "slug": "zane-davis",     "profiled": False},
]

ALL_CUTTING = [
    {"name": "Adan Banuelos",    "slug": "adan-banuelos",    "profiled": True},
    {"name": "Beau Galyean",     "slug": "beau-galyean",     "profiled": True},
    {"name": "Austin Shepard",   "slug": "austin-shepard",   "profiled": True},
    {"name": "Weslay Galyean",   "slug": "weslay-galyean",   "profiled": False},
    {"name": "Tarin Rice",       "slug": "tarin-rice",       "profiled": False},
    {"name": "Kody Porterfield", "slug": "kody-porterfield", "profiled": False},
    {"name": "Kenny Platt",      "slug": "kenny-platt",      "profiled": False},
    {"name": "Cullen Chartier",  "slug": "cullen-chartier",  "profiled": False},
]

DISC_ROSTER = {
    "reining":   ALL_REINING,
    "cow-horse": ALL_COWHORSE,
    "cutting":   ALL_CUTTING,
}

# ── Per-rider data ────────────────────────────────────────────────────────────

RIDERS = [
    # ── REINING ──────────────────────────────────────────────
    {
        "name":      "Andrea Fappani",
        "slug":      "andrea-fappani",
        "disc":      "Reining",
        "disc_slug": "reining",
        "disc_icon": "🐴",
        "disc_num":  "01",
        "hometown":  "Scottsdale, AZ",
        "meta_desc": "Explore the fantasy rider profile for Andrea Fappani in Fantasy Run For A Million. Reining competitor and fantasy team pick.",
        "intro":     "Andrea Fappani is one of the most decorated reining professionals in the sport, known for producing horses with exceptional athleticism and maneuver quality. A consistent performer at the highest levels of national and international competition.",
        "highlights": [
            "Multiple major reining title holder across national and international competition",
            "Known for producing and showing horses with elite sliding stop and spin quality",
            "Consistent finalist at premier open reining events across North America and Europe",
            "Recognized as a top professional trainer and exhibitor in NRHA competition",
        ],
        "events":    "Regular competitor at premier NRHA-affiliated events including major futurities, derbies, and select events.",
        "disc_spec": "Fappani's reining style is defined by precise pattern execution and bold maneuver delivery. His horses are trained to maximize maneuver scores, making him a high-upside fantasy selection when conditions favor clean, assertive pattern work.",
        "fv_note":   "As one of the most recognized names in reining, Fappani carries high fantasy value — particularly in contests that weight top-3 finishes heavily. His consistency at major events makes him a reliable anchor pick for any fantasy reining roster.",
    },
    {
        "name":      "Casey Deary",
        "slug":      "casey-deary",
        "disc":      "Reining",
        "disc_slug": "reining",
        "disc_icon": "🐴",
        "disc_num":  "01",
        "hometown":  "Dry Fork, VA",
        "meta_desc": "Explore the fantasy rider profile for Casey Deary in Fantasy Run For A Million. Reining competitor and fantasy team pick.",
        "intro":     "Casey Deary has established himself as one of the premier reining professionals on the East Coast circuit, with a competitive record that spans major open events across the country. Known for exceptional horsemanship and consistency under pressure.",
        "highlights": [
            "Multiple open reining class wins at major national events",
            "Respected trainer and competitor across NRHA affiliated competition",
            "Known for preparing horses that score consistently across pattern elements",
            "A frequent finalist in high-level open and non-pro reining competition",
        ],
        "events":    "Competes regularly at major national reining events including premier futurities and select open competitions.",
        "disc_spec": "Deary's horses are known for their trainability and consistency. In a fantasy format that rewards reliable top-10 finishes across multiple classes, Deary provides steady points accumulation alongside upside for big scores.",
        "fv_note":   "A strong mid-to-upper-tier fantasy pick in reining. Deary's consistency in major open competition means your team collects baseline points even when he doesn't win — and full placement points when he does.",
    },
    {
        "name":      "Cade McCutcheon",
        "slug":      "cade-mccutcheon",
        "disc":      "Reining",
        "disc_slug": "reining",
        "disc_icon": "🐴",
        "disc_num":  "01",
        "hometown":  "Aubrey, TX",
        "meta_desc": "Explore the fantasy rider profile for Cade McCutcheon in Fantasy Run For A Million. Reining competitor and fantasy team pick.",
        "intro":     "Cade McCutcheon is one of the most accomplished young professionals in the reining industry, carrying the legacy of a renowned reining family while building an elite record of his own across both professional and non-pro competition.",
        "highlights": [
            "Multiple major reining championship titles across open and non-pro divisions",
            "Part of one of the most accomplished reining families in the sport's history",
            "Consistent top placer at premier NRHA events including futurities and derbies",
            "A dual threat as both professional exhibitor and top-tier trainer",
        ],
        "events":    "Regular competitor at the highest level of NRHA competition, including major open events and select international appearances.",
        "disc_spec": "McCutcheon combines pattern precision with the horsemanship instincts developed in a top reining program from an early age. His ability to show horses with both accuracy and boldness makes him an effective fantasy selection across event formats.",
        "fv_note":   "McCutcheon's family pedigree and personal competitive record make him one of the most recognizable names in reining. Fantasy teams selecting him are banking on a rider who regularly places at the top of the most competitive open classes.",
    },

    # ── COW HORSE ────────────────────────────────────────────
    {
        "name":      "Corey Cushing",
        "slug":      "corey-cushing",
        "disc":      "Cow Horse",
        "disc_slug": "cow-horse",
        "disc_icon": "🤠",
        "disc_num":  "02",
        "hometown":  "Temecula, CA",
        "meta_desc": "Explore the fantasy rider profile for Corey Cushing in Fantasy Run For A Million. Cow horse competitor and fantasy team pick.",
        "intro":     "Corey Cushing is one of the premier cow horse professionals in the Western performance horse industry, known for producing and showing horses that compete at the highest level across all three phases of cow horse competition.",
        "highlights": [
            "Multiple major cow horse title wins across premier NRCHA-affiliated events",
            "Top competitor in reined work, fence work, and cow work phases",
            "Recognized as one of the most effective open division cow horse trainers",
            "Regular finalist at premier cow horse events including select events and futurities",
        ],
        "events":    "Competes at premier NRCHA events including major futurities, derbies, and select events across North America.",
        "disc_spec": "Cow horse requires excellence across three distinct phases, and Cushing's horses are built for composite score accumulation. His ability to post strong scores in reined work and then follow through in cow work makes him one of the higher-ceiling fantasy picks in the discipline.",
        "fv_note":   "In a fantasy format that scores cow horse on composite placing, Cushing's ability to perform across all phases gives him higher expected value than riders who dominate one phase but struggle in others. A premier first-round fantasy pick at the cow horse position.",
    },
    {
        "name":      "Boyd Rice",
        "slug":      "boyd-rice",
        "disc":      "Cow Horse",
        "disc_slug": "cow-horse",
        "disc_icon": "🤠",
        "disc_num":  "02",
        "hometown":  "Weatherford, TX",
        "meta_desc": "Explore the fantasy rider profile for Boyd Rice in Fantasy Run For A Million. Cow horse competitor and fantasy team pick.",
        "intro":     "Boyd Rice brings decades of cow horse expertise to The Run For A Million, with a reputation built on producing versatile, athletic horses capable of competing deep into the rounds of the sport's most competitive events.",
        "highlights": [
            "Longtime open division competitor at major NRCHA cow horse events",
            "Known for developing horses with exceptional cow sense and fence work ability",
            "Consistent presence in finals at premier cow horse competitions",
            "Recognized for horsemanship across all three cow horse competition phases",
        ],
        "events":    "Regular open division competitor at premier NRCHA select events, futurities, and major cow horse competitions.",
        "disc_spec": "Rice's horses are known for their cow work athleticism — a discipline phase that can separate the top placers from the field. In fantasy formats that weight composite scores, his ability to deliver strong fence and cow work scores is a meaningful differentiator.",
        "fv_note":   "Rice represents strong value for fantasy teams looking for a reliable cow horse pick with genuine top-5 upside. His experience at the highest levels of NRCHA competition gives him the composure to perform in high-pressure championship rounds.",
    },
    {
        "name":      "Chris Dawson",
        "slug":      "chris-dawson",
        "disc":      "Cow Horse",
        "disc_slug": "cow-horse",
        "disc_icon": "🤠",
        "disc_num":  "02",
        "hometown":  "Scottsdale, AZ",
        "meta_desc": "Explore the fantasy rider profile for Chris Dawson in Fantasy Run For A Million. Cow horse competitor and fantasy team pick.",
        "intro":     "Chris Dawson is a seasoned cow horse professional with a competitive record that spans multiple disciplines and event formats. Known for his ability to prepare horses that compete with consistency and athleticism across all cow horse phases.",
        "highlights": [
            "Multi-discipline competitor with experience across reined cow horse and cutting",
            "Consistent open division finalist at major cow horse events",
            "Known for preparing horses with strong reined work foundations",
            "A respected trainer and exhibitor in the Western performance horse industry",
        ],
        "events":    "Competes at major NRCHA-affiliated events across North America, with a strong presence at premier open division competition.",
        "disc_spec": "Dawson's multi-discipline background gives him a tactical edge in cow horse — a sport that rewards riders who understand both the precision demands of reined work and the instinctive demands of live cow work. His horses tend to be well-rounded composite scorers.",
        "fv_note":   "A versatile and consistent fantasy pick for the cow horse position. Dawson's broad competitive background means his horses are prepared for the full range of demands in a cow horse class — giving your fantasy team reliable composite scoring across all phases.",
    },

    # ── CUTTING ──────────────────────────────────────────────
    {
        "name":      "Adan Banuelos",
        "slug":      "adan-banuelos",
        "disc":      "Cutting",
        "disc_slug": "cutting",
        "disc_icon": "🐂",
        "disc_num":  "03",
        "hometown":  "Weatherford, TX",
        "meta_desc": "Explore the fantasy rider profile for Adan Banuelos in Fantasy Run For A Million. Cutting competitor and fantasy team pick.",
        "intro":     "Adan Banuelos is widely regarded as one of the most dominant cutting professionals of his generation, with a record of major event wins and championship titles that place him among the elite of the sport at every level of competition.",
        "highlights": [
            "Multiple major cutting championship titles at premier NCHA-affiliated events",
            "One of the most decorated open division cutting competitors of his era",
            "Known for showing horses with exceptional cow sense and degree-of-difficulty",
            "A multiple finalist and winner at the most prestigious cutting events in the world",
        ],
        "events":    "Regular competitor at premier NCHA cutting events including the Futurity, Derby, and major open select events.",
        "disc_spec": "Banuelos excels at selecting high-difficulty cattle and trusting his horses to perform — a combination that results in the kind of high-scoring runs that dominate cutting leaderboards. In a fantasy format, his upside in any given class is as high as any rider in the field.",
        "fv_note":   "The highest-ceiling fantasy pick in cutting. Banuelos is a natural first selection for any fantasy team built around the cutting discipline. His combination of title pedigree, horse quality, and tactical ability makes him the benchmark pick in this position.",
    },
    {
        "name":      "Beau Galyean",
        "slug":      "beau-galyean",
        "disc":      "Cutting",
        "disc_slug": "cutting",
        "disc_icon": "🐂",
        "disc_num":  "03",
        "hometown":  "Whitesboro, TX",
        "meta_desc": "Explore the fantasy rider profile for Beau Galyean in Fantasy Run For A Million. Cutting competitor and fantasy team pick.",
        "intro":     "Beau Galyean is one of the most accomplished open division cutting professionals in the sport, consistently competing at the highest levels of NCHA competition with a record that includes major title wins and deep championship runs.",
        "highlights": [
            "Multiple open division cutting title wins at major NCHA events",
            "Consistent finals presence at the most competitive cutting events in North America",
            "Known for producing and showing horses with elite athleticism and trainability",
            "Part of one of the most recognized cutting families in the sport",
        ],
        "events":    "Competes at premier NCHA events including major futurities, derbies, and open select events across North America.",
        "disc_spec": "Galyean's cutting style prioritizes horse athleticism and cattle selection — he consistently places himself in position to score high when his horses are working at their best. His championship pedigree and competitive depth make him a consistent fantasy performer.",
        "fv_note":   "A premier-tier cutting fantasy pick. Galyean's regular presence in finals at major cutting events means your team has strong placement point potential. He pairs well with Banuelos if your strategy targets the cutting discipline heavily.",
    },
    {
        "name":      "Austin Shepard",
        "slug":      "austin-shepard",
        "disc":      "Cutting",
        "disc_slug": "cutting",
        "disc_icon": "🐂",
        "disc_num":  "03",
        "hometown":  "Summerfield, NC",
        "meta_desc": "Explore the fantasy rider profile for Austin Shepard in Fantasy Run For A Million. Cutting competitor and fantasy team pick.",
        "intro":     "Austin Shepard has built one of the most respected cutting programs in the Southeast, with a competitive record that demonstrates consistent performance at national-level events and a reputation for developing horses with natural cow instinct.",
        "highlights": [
            "Multiple major cutting class wins at premier NCHA-affiliated competition",
            "Known for developing horses with exceptional natural cow sense",
            "Consistent open division competitor at national cutting events",
            "A respected trainer with a growing presence at the highest levels of the sport",
        ],
        "events":    "Competes at major NCHA cutting events across North America with strong open division results.",
        "disc_spec": "Shepard's cutting style emphasizes horse-cattle interaction — he allows his horses to work cattle with minimal interference, which in high-cattle-quality pen draws can produce the kind of difficult, impressive runs that judges reward with peak scores.",
        "fv_note":   "A strong value pick in the cutting fantasy position. Shepard's combination of competitive experience and horse development ability gives him genuine upside in any class where the pen draw is favorable. A smart second or third cut selection on a cutting-focused fantasy team.",
    },
]


# ── HTML template ─────────────────────────────────────────────────────────────

def initials(name):
    parts = name.split()
    return (parts[0][0] + parts[-1][0]).upper()

def related_riders_html(rider):
    roster = DISC_ROSTER[rider["disc_slug"]]
    related = [r for r in roster if r["slug"] != rider["slug"]][:3]
    cards = []
    for r in related:
        if r["profiled"]:
            btn = f'<a href="/riders/{rider["disc_slug"]}/{r["slug"]}" class="rider-rel-btn active">View Profile →</a>'
        else:
            btn = '<span class="rider-rel-btn disabled">Profile Coming Soon</span>'
        cards.append(f"""
          <article class="rel-card">
            <div class="rel-avatar" aria-hidden="true">{initials(r["name"])}</div>
            <h4 class="rel-name">{r["name"]}</h4>
            <span class="rel-disc-tag">{rider["disc"]}</span>
            {btn}
          </article>""")
    return "\n".join(cards)

def build_page(rider):
    ini = initials(rider["name"])
    disc = rider["disc"]
    disc_slug = rider["disc_slug"]
    disc_icon = rider["disc_icon"]
    related_html = related_riders_html(rider)
    highlights_html = "\n".join(
        f'            <li class="highlight-item"><span class="hl-bullet" aria-hidden="true">◆</span>{h}</li>'
        for h in rider["highlights"]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{rider["name"]} | {disc} Rider Profile | Fantasy Run For A Million</title>
  <meta name="description" content="{rider["meta_desc"]}" />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="{rider["name"]} | Fantasy Run For A Million" />
  <meta property="og:description" content="{rider["meta_desc"]}" />
  <meta property="og:type" content="profile" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

  <style>
    :root {{
      --black:        #0e0b08;
      --dark:         #1a1410;
      --dark-mid:     #241c14;
      --leather:      #8B5E3C;
      --gold:         #C9A84C;
      --gold-light:   #e8c96a;
      --rust:         #C4622D;
      --cream:        #F5EDD6;
      --cream-dim:    #c8bc9e;
      --white:        #ffffff;
      --font-display: 'Playfair Display', Georgia, serif;
      --font-body:    'DM Sans', sans-serif;
      --radius:       6px;
      --radius-lg:    12px;
      --max-w:        1100px;
      --tr:           0.22s ease;
    }}
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html {{ scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }}
    body {{ font-family: var(--font-body); background: var(--dark); color: var(--cream); line-height: 1.6; font-size: 16px; }}
    a {{ color: inherit; text-decoration: none; }}
    .container {{ width: 100%; max-width: var(--max-w); margin: 0 auto; padding: 0 20px; }}
    .sr-only {{ position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }}

    /* Nav */
    .site-nav {{ position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(14,11,8,0.92); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom: 1px solid rgba(201,168,76,0.18); }}
    .nav-inner {{ display: flex; align-items: center; justify-content: space-between; height: 58px; max-width: var(--max-w); margin: 0 auto; padding: 0 20px; }}
    .nav-logo {{ font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--gold); line-height: 1.2; }}
    .nav-logo span {{ display: block; font-size: 0.65rem; color: var(--cream-dim); font-family: var(--font-body); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }}
    .nav-links {{ display: flex; gap: 28px; list-style: none; }}
    .nav-links a {{ font-size: 0.82rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cream-dim); transition: color var(--tr); }}
    .nav-links a:hover, .nav-links a[aria-current] {{ color: var(--gold); }}
    .nav-links .nav-cta a {{ color: var(--gold); border: 1px solid rgba(201,168,76,0.4); padding: 5px 14px; border-radius: var(--radius); }}
    .nav-links .nav-cta a:hover {{ background: rgba(201,168,76,0.12); }}
    .nav-hamburger {{ display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }}
    .nav-hamburger span {{ display: block; width: 22px; height: 2px; background: var(--cream); border-radius: 2px; }}
    .nav-mobile {{ display: none; flex-direction: column; background: var(--black); border-top: 1px solid rgba(201,168,76,0.12); padding: 16px 20px 20px; gap: 4px; }}
    .nav-mobile.open {{ display: flex; }}
    .nav-mobile a {{ font-size: 0.9rem; font-weight: 500; color: var(--cream-dim); padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }}
    .nav-mobile a:last-child {{ border-bottom: none; }}

    /* Page Hero */
    .page-header {{
      padding: 100px 0 0;
      background: linear-gradient(160deg, #0e0b08 0%, #1a1410 55%, #1f1710 100%);
      border-bottom: 1px solid rgba(201,168,76,0.1);
      position: relative; overflow: hidden;
    }}
    .page-header::before {{
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 55% 65% at 88% 25%, rgba(139,94,60,0.13) 0%, transparent 65%),
        radial-gradient(ellipse 35% 45% at 5% 80%, rgba(196,98,45,0.06) 0%, transparent 60%);
      pointer-events: none;
    }}
    .header-inner {{ position: relative; z-index: 1; padding: 28px 0 56px; }}
    .breadcrumb {{ display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--cream-dim); opacity: 0.65; margin-bottom: 28px; letter-spacing: 0.05em; flex-wrap: wrap; }}
    .breadcrumb a {{ transition: color var(--tr); }}
    .breadcrumb a:hover {{ color: var(--gold); opacity: 1; }}
    .breadcrumb .sep {{ opacity: 0.35; }}

    /* Hero layout */
    .hero-layout {{ display: grid; grid-template-columns: auto 1fr; gap: 36px; align-items: flex-start; }}
    .hero-avatar-col {{ display: flex; flex-direction: column; align-items: center; gap: 14px; }}
    .hero-avatar {{
      width: 120px; height: 120px; border-radius: 50%;
      background: linear-gradient(135deg, rgba(139,94,60,0.5), rgba(201,168,76,0.2));
      border: 2px solid rgba(201,168,76,0.35);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-size: 2.4rem; font-weight: 900;
      color: var(--gold); position: relative;
    }}
    .avatar-disc-ring {{
      position: absolute; inset: -5px; border-radius: 50%;
      border: 1px solid rgba(201,168,76,0.2);
    }}
    .avatar-img-note {{ font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cream-dim); opacity: 0.35; text-align: center; max-width: 100px; }}

    /* Watchlist button */
    .btn-watchlist {{
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3);
      border-radius: var(--radius); padding: 9px 18px;
      font-family: var(--font-body); font-size: 0.78rem;
      font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
      color: var(--gold); cursor: default;
      white-space: nowrap;
    }}
    .btn-watchlist::before {{ content: '♡'; font-size: 0.9rem; }}

    /* Hero text */
    .hero-text {{ padding-top: 4px; }}
    .hero-eyebrow {{ display: inline-flex; align-items: center; gap: 10px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }}
    .hero-eyebrow::before {{ content: ''; display: block; width: 20px; height: 1px; background: var(--gold); }}
    .disc-badge {{ display: inline-flex; align-items: center; gap: 8px; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.25); border-radius: 4px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); padding: 4px 12px; margin-bottom: 14px; }}
    .hero-name {{ font-family: var(--font-display); font-size: clamp(2rem, 4.5vw, 3.2rem); font-weight: 900; color: var(--white); line-height: 1.06; margin-bottom: 10px; }}
    .hero-hometown {{ display: flex; align-items: center; gap: 6px; font-size: 0.88rem; color: var(--cream-dim); margin-bottom: 22px; }}
    .hero-hometown::before {{ content: '📍'; font-size: 0.78rem; }}

    /* Hero quick stats */
    .hero-stat-row {{ display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 24px; }}
    .hero-stat {{ display: flex; flex-direction: column; gap: 3px; }}
    .hero-stat strong {{ font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--gold); line-height: 1; }}
    .hero-stat span {{ font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cream-dim); }}
    .hero-stat .demo-val {{ font-family: var(--font-body); font-size: 0.8rem; font-style: italic; color: var(--cream-dim); opacity: 0.45; }}

    /* ── Main layout ─── */
    .content-section {{ padding: 64px 0; }}
    .content-section.alt {{ background: var(--dark-mid); border-top: 1px solid rgba(201,168,76,0.08); border-bottom: 1px solid rgba(201,168,76,0.08); }}
    .two-col {{ display: grid; grid-template-columns: 1fr 340px; gap: 48px; align-items: start; }}
    .main-col {{ display: flex; flex-direction: column; gap: 40px; }}
    .sidebar-col {{ position: sticky; top: 76px; display: flex; flex-direction: column; gap: 16px; }}

    /* Content blocks */
    .content-block {{ display: flex; flex-direction: column; gap: 14px; }}
    .block-label {{ font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); }}
    .block-title {{ font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: var(--white); }}
    .block-divider {{ width: 28px; height: 2px; background: var(--gold); }}
    .block-body {{ font-size: 0.9rem; color: var(--cream-dim); line-height: 1.72; }}

    /* Highlights list */
    .highlights-list {{ list-style: none; display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }}
    .highlight-item {{ display: flex; align-items: flex-start; gap: 12px; font-size: 0.875rem; color: var(--cream-dim); line-height: 1.6; }}
    .hl-bullet {{ color: var(--gold); opacity: 0.6; font-size: 0.5rem; margin-top: 6px; flex-shrink: 0; }}

    /* Sample notice inline */
    .sample-notice {{
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(196,98,45,0.08); border: 1px solid rgba(196,98,45,0.2);
      border-radius: 4px; font-size: 0.65rem; font-weight: 600;
      letter-spacing: 0.09em; text-transform: uppercase;
      color: #e8a070; padding: 4px 10px;
    }}
    .sample-notice::before {{ content: '⚠'; }}

    /* ── Fantasy Stats Sidebar card ─── */
    .stats-card {{
      background: var(--dark-mid);
      border: 1px solid rgba(201,168,76,0.15);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }}
    .stats-card-header {{
      padding: 18px 20px 14px;
      border-bottom: 1px solid rgba(201,168,76,0.1);
      display: flex; align-items: center; justify-content: space-between;
    }}
    .stats-card-title {{ font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--white); }}
    .stats-grid {{ padding: 16px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(201,168,76,0.08); }}
    .stat-cell {{ background: var(--dark-mid); padding: 14px 12px; display: flex; flex-direction: column; gap: 4px; }}
    .stat-label {{ font-size: 0.6rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cream-dim); opacity: 0.5; }}
    .stat-val {{ font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--gold); line-height: 1; }}
    .stat-val.tbd {{ font-family: var(--font-body); font-size: 0.75rem; font-weight: 400; color: var(--cream-dim); opacity: 0.35; font-style: italic; }}
    .stats-note {{ padding: 12px 20px; font-size: 0.7rem; color: var(--cream-dim); opacity: 0.4; line-height: 1.5; font-style: italic; border-top: 1px solid rgba(201,168,76,0.07); }}

    /* Sidebar quick links card */
    .links-card {{
      background: var(--dark-mid);
      border: 1px solid rgba(201,168,76,0.12);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex; flex-direction: column; gap: 6px;
    }}
    .links-card-title {{ font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); opacity: 0.7; margin-bottom: 6px; }}
    .sidebar-link {{ display: flex; align-items: center; gap: 8px; font-size: 0.83rem; color: var(--cream-dim); padding: 7px 0; border-bottom: 1px solid rgba(201,168,76,0.07); transition: color var(--tr); }}
    .sidebar-link:last-child {{ border-bottom: none; }}
    .sidebar-link:hover {{ color: var(--gold); }}
    .sidebar-link::before {{ content: '→'; font-size: 0.7rem; color: var(--gold); opacity: 0.5; }}

    /* ── Related Riders ─── */
    .related-section {{ padding: 60px 0; }}
    .section-label {{ font-size: 0.7rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; }}
    .section-title {{ font-family: var(--font-display); font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 700; color: var(--white); margin-bottom: 10px; }}
    .divider {{ width: 32px; height: 2px; background: var(--gold); margin: 12px 0 28px; }}
    .related-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
    .rel-card {{
      background: var(--dark-mid);
      border: 1px solid rgba(201,168,76,0.12);
      border-radius: var(--radius-lg);
      padding: 28px 22px;
      display: flex; flex-direction: column; gap: 10px;
      transition: border-color var(--tr), transform var(--tr);
    }}
    .rel-card:hover {{ border-color: rgba(201,168,76,0.28); transform: translateY(-2px); }}
    .rel-avatar {{ width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, rgba(139,94,60,0.4), rgba(201,168,76,0.15)); border: 1px solid rgba(201,168,76,0.22); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--gold); }}
    .rel-name {{ font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--white); line-height: 1.2; }}
    .rel-disc-tag {{ display: inline-block; font-size: 0.63rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2); border-radius: 3px; padding: 2px 8px; width: fit-content; }}
    .rider-rel-btn {{ display: inline-block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; padding: 8px 14px; border-radius: var(--radius); margin-top: 6px; font-family: var(--font-body); }}
    .rider-rel-btn.active {{ background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); color: var(--gold); transition: background var(--tr); }}
    .rider-rel-btn.active:hover {{ background: rgba(201,168,76,0.18); }}
    .rider-rel-btn.disabled {{ background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: var(--cream-dim); opacity: 0.45; cursor: default; }}

    /* Bottom nav links */
    .back-nav {{ padding: 36px 0 56px; border-top: 1px solid rgba(201,168,76,0.08); }}
    .back-nav-inner {{ display: flex; gap: 24px; flex-wrap: wrap; align-items: center; }}
    .back-link {{ display: inline-flex; align-items: center; gap: 7px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--cream-dim); transition: color var(--tr); }}
    .back-link:hover {{ color: var(--gold); }}
    .back-link.primary {{ color: var(--gold); }}
    .back-link::before {{ content: '←'; font-size: 0.75rem; }}

    /* Footer */
    .site-footer {{ background: var(--black); border-top: 1px solid rgba(201,168,76,0.1); padding: 36px 0; }}
    .footer-inner {{ display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }}
    .footer-logo {{ font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--gold); }}
    .footer-note {{ font-size: 0.78rem; color: var(--cream-dim); opacity: 0.6; }}
    .footer-links {{ display: flex; gap: 22px; list-style: none; }}
    .footer-links a {{ font-size: 0.78rem; color: var(--cream-dim); opacity: 0.6; transition: opacity var(--tr); }}
    .footer-links a:hover {{ opacity: 1; }}

    /* Mobile */
    @media (max-width: 900px) {{
      .nav-links {{ display: none; }}
      .nav-hamburger {{ display: flex; }}
      .two-col {{ grid-template-columns: 1fr; }}
      .sidebar-col {{ position: static; }}
      .related-grid {{ grid-template-columns: 1fr 1fr; }}
      .footer-inner {{ flex-direction: column; text-align: center; }}
      .footer-links {{ justify-content: center; }}
    }}
    @media (max-width: 640px) {{
      .hero-layout {{ grid-template-columns: 1fr; }}
      .hero-avatar-col {{ flex-direction: row; align-items: center; gap: 20px; }}
      .avatar-img-note {{ display: none; }}
      .related-grid {{ grid-template-columns: 1fr; }}
      .back-nav-inner {{ flex-direction: column; align-items: flex-start; gap: 14px; }}
      .hero-stat-row {{ gap: 16px; }}
    }}
  </style>
</head>
<body>

  <nav class="site-nav" aria-label="Site navigation">
    <div class="nav-inner">
      <a href="/" class="nav-logo">Fantasy Run For A Million<span>Western Horse Fantasy Sports</span></a>
      <ul class="nav-links" role="list">
        <li><a href="/how-it-works">How It Works</a></li>
        <li><a href="/riders" aria-current="true">Riders</a></li>
        <li><a href="/leaderboard">Leaderboard</a></li>
        <li><a href="/scoring-rules">Scoring</a></li>
        <li class="nav-cta"><a href="/enter">Enter Now</a></li>
      </ul>
      <button class="nav-hamburger" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <nav class="nav-mobile" id="mobileMenu" aria-label="Mobile navigation">
      <a href="/how-it-works">How It Works</a>
      <a href="/riders">Riders</a>
      <a href="/leaderboard">Leaderboard</a>
      <a href="/scoring-rules">Scoring Rules</a>
      <a href="/enter">Enter Now</a>
    </nav>
  </nav>

  <main>

    <header class="page-header" aria-labelledby="rider-name-heading">
      <div class="container">
        <div class="header-inner">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a><span class="sep">›</span>
            <a href="/riders">Riders</a><span class="sep">›</span>
            <a href="/riders/{disc_slug}">{disc}</a><span class="sep">›</span>
            <span>{rider["name"]}</span>
          </nav>

          <div class="hero-layout">
            <div class="hero-avatar-col">
              <div class="hero-avatar" aria-label="{rider["name"]} avatar — image placeholder">
                {ini}
                <div class="avatar-disc-ring" aria-hidden="true"></div>
              </div>
              <p class="avatar-img-note">Rider image coming soon</p>
              <button class="btn-watchlist" disabled aria-label="Add to fantasy watchlist — coming soon">
                Watchlist
              </button>
            </div>

            <div class="hero-text">
              <p class="hero-eyebrow">{disc_icon} {disc} Rider</p>
              <div class="disc-badge">{disc_icon} Discipline {rider["disc_num"]}</div>
              <h1 class="hero-name" id="rider-name-heading">{rider["name"]}</h1>
              <p class="hero-hometown">{rider["hometown"]}</p>

              <div class="hero-stat-row" aria-label="Rider stats — sample data">
                <div class="hero-stat">
                  <strong class="demo-val">—</strong>
                  <span>Fantasy Rank</span>
                </div>
                <div class="hero-stat">
                  <strong class="demo-val">—</strong>
                  <span>Fantasy Pts</span>
                </div>
                <div class="hero-stat">
                  <strong class="demo-val">—</strong>
                  <span>Avg Finish</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Two-column: main content + sidebar -->
    <div class="content-section">
      <div class="container">
        <div class="two-col">

          <!-- Main Column -->
          <div class="main-col">

            <div class="content-block">
              <p class="block-label">Rider Overview</p>
              <h2 class="block-title">About {rider["name"]}</h2>
              <div class="block-divider" aria-hidden="true"></div>
              <p class="block-body">{rider["intro"]}</p>
            </div>

            <div class="content-block">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <h2 class="block-title">Career Highlights</h2>
                <span class="sample-notice">General Overview</span>
              </div>
              <div class="block-divider" aria-hidden="true"></div>
              <ul class="highlights-list" aria-label="Career highlights">
{highlights_html}
              </ul>
            </div>

            <div class="content-block">
              <h2 class="block-title">Major Event Appearances</h2>
              <div class="block-divider" aria-hidden="true"></div>
              <p class="block-body">{rider["events"]}</p>
            </div>

            <div class="content-block">
              <h2 class="block-title">Discipline Specialization</h2>
              <div class="block-divider" aria-hidden="true"></div>
              <p class="block-body">{rider["disc_spec"]}</p>
            </div>

            <div class="content-block">
              <h2 class="block-title">Fantasy Value Overview</h2>
              <div class="block-divider" aria-hidden="true"></div>
              <p class="block-body">{rider["fv_note"]}</p>
            </div>

          </div><!-- /main-col -->

          <!-- Sidebar -->
          <aside class="sidebar-col" aria-label="Fantasy statistics and navigation">

            <div class="stats-card">
              <div class="stats-card-header">
                <h3 class="stats-card-title">Fantasy Statistics</h3>
                <span class="sample-notice">Demo</span>
              </div>
              <div class="stats-grid" aria-label="Placeholder fantasy statistics">
                <div class="stat-cell">
                  <p class="stat-label">Events Entered</p>
                  <p class="stat-val tbd">— TBD</p>
                </div>
                <div class="stat-cell">
                  <p class="stat-label">Top 10 Finishes</p>
                  <p class="stat-val tbd">— TBD</p>
                </div>
                <div class="stat-cell">
                  <p class="stat-label">Discipline Pts</p>
                  <p class="stat-val tbd">— TBD</p>
                </div>
                <div class="stat-cell">
                  <p class="stat-label">Fantasy Rank</p>
                  <p class="stat-val tbd">— TBD</p>
                </div>
                <div class="stat-cell" style="grid-column:1/-1;">
                  <p class="stat-label">Average Finish</p>
                  <p class="stat-val tbd">— TBD</p>
                </div>
              </div>
              <p class="stats-note">Statistics update when official Run For A Million results are posted. All values above are placeholders.</p>
            </div>

            <div class="links-card" aria-label="Navigation links">
              <p class="links-card-title">Navigate</p>
              <a href="/riders/{disc_slug}" class="sidebar-link">All {disc} Riders</a>
              <a href="/riders" class="sidebar-link">Full Rider Database</a>
              <a href="/leaderboard" class="sidebar-link">Fantasy Leaderboard</a>
              <a href="/scoring-rules" class="sidebar-link">Scoring Rules</a>
              <a href="/how-it-works" class="sidebar-link">How It Works</a>
            </div>

          </aside>

        </div>
      </div>
    </div>

    <!-- Related Riders -->
    <section class="related-section content-section alt" aria-labelledby="related-heading">
      <div class="container">
        <p class="section-label">Same Discipline</p>
        <h2 class="section-title" id="related-heading">Other {disc} Riders</h2>
        <div class="divider" aria-hidden="true"></div>
        <div class="related-grid" role="list">
{related_html}
        </div>
        <div style="margin-top:24px;">
          <a href="/riders/{disc_slug}" style="display:inline-flex;align-items:center;gap:8px;font-size:0.82rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);">
            View All {disc} Riders →
          </a>
        </div>
      </div>
    </section>

    <!-- Bottom navigation -->
    <div class="back-nav">
      <div class="container">
        <div class="back-nav-inner">
          <a href="/riders/{disc_slug}" class="back-link primary">{disc} Riders</a>
          <a href="/riders" class="back-link">All Riders</a>
          <a href="/leaderboard" class="back-link">Leaderboard</a>
          <a href="/scoring-rules" class="back-link">Scoring Rules</a>
        </div>
      </div>
    </div>

  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-logo">Fantasy Run For A Million</div>
        <p class="footer-note">Fan engagement platform. Not affiliated with The Run For A Million.</p>
        <ul class="footer-links" role="list">
          <li><a href="/how-it-works">How It Works</a></li>
          <li><a href="/scoring-rules">Scoring</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </footer>

  <script>
    (function () {{
      const btn  = document.getElementById('navToggle');
      const menu = document.getElementById('mobileMenu');
      if (!btn || !menu) return;
      btn.addEventListener('click', function () {{
        const open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
      }});
      document.addEventListener('click', function (e) {{
        if (!btn.contains(e.target) && !menu.contains(e.target)) {{
          menu.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }}
      }});
    }})();
  </script>

</body>
</html>"""


# ── Generate all pages ────────────────────────────────────────────────────────

generated = []
for rider in RIDERS:
    out_dir = os.path.join(OUT_BASE, rider["disc_slug"], rider["slug"])
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "index.html")
    html = build_page(rider)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    generated.append(out_path)
    print(f"✓  {out_path}")

print(f"\n{len(generated)} rider profile pages generated.")
