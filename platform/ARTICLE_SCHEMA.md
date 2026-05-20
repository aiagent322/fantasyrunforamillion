# Fantasy Run For A Million — Article Content Schema

> **Version:** 1.0.0  
> **Generator:** `/home/claude/generate_articles.py`  
> **Status:** Static file generation — CMS-ready architecture

---

## Published Articles (8)

| Slug | Category | Route |
|------|----------|-------|
| `understanding-reining-maneuver-scores` | Reining | `/news/understanding-reining-maneuver-scores` |
| `the-sliding-stop-reinings-signature-maneuver` | Reining | `/news/the-sliding-stop-reinings-signature-maneuver` |
| `cow-horse-composite-scoring-explained` | Cow Horse | `/news/cow-horse-composite-scoring-explained` |
| `fantasy-cow-horse-strategy-all-three-phases` | Fantasy Strategy | `/news/fantasy-cow-horse-strategy-all-three-phases` |
| `cutting-judging-criteria-explained` | Cutting | `/news/cutting-judging-criteria-explained` |
| `how-to-build-balanced-fantasy-roster` | Fantasy Strategy | `/news/how-to-build-balanced-fantasy-roster` |
| `run-for-a-million-format-fantasy-guide` | Event Coverage | `/news/run-for-a-million-format-fantasy-guide` |
| `western-performance-horse-disciplines-guide` | Western Sports | `/news/western-performance-horse-disciplines-guide` |

---

## Article Data Structure (Python dict → HTML)

Each article in `generate_articles.py` ARTICLES list contains:

```python
{
    "slug":          "article-url-slug",         # → /news/{slug}/
    "title":         "Display headline",         # → <h1>, og:title
    "seo_title":     "SEO-optimized title",      # → <title> (max 60 chars)
    "category":      "Display category",         # → cat badge, breadcrumb
    "cat_slug":      "category-slug",            # → breadcrumb href
    "meta_desc":     "Meta description",         # → <meta description>, og:desc (max 155 chars)
    "excerpt":       "Card excerpt",             # → news hub cards
    "read_time":     "N min read",               # → article meta row
    "tags":          ["tag1", "tag2"],           # → tag pills sidebar
    "rider_refs": [                              # → featured riders sidebar
        {"name": "Rider Name", "slug": "rider-slug",
         "disc_slug": "discipline", "disc": "Discipline Label"}
    ],
    "related_slugs": ["slug1", "slug2", "slug3"], # → related articles strip
    "related_links": [("/path", "Label")],        # → related pages sidebar
    "sections": [                                 # → article body H2 sections
        {"h2": "Section Heading", "body": "<p>HTML content with <a> links</p>"}
    ],
}
```

---

## Adding a New Article

1. Open `/home/claude/generate_articles.py`
2. Add a new dict to the `ARTICLES` list following the schema above
3. Run: `python3 generate_articles.py`
4. Verify output at `/mnt/user-data/outputs/news/{slug}/index.html`
5. Add article to the relevant news hub card list in the hub update script
6. Update sitemap.xml (auto-added by generator if not already present)

---

## Article Template Features

Each generated article page includes:

**Head:** `<title>`, meta description, canonical URL, og:type=article, og:image=og-news.jpg, twitter:card, Article + BreadcrumbList JSON-LD, Google Fonts preconnect

**Article header:** Breadcrumb nav, category badge, H1 headline, meta row (author · read time · sport)

**Featured image area:** Styled placeholder with category initial and label

**Two-column layout (70/30):**
- Main: article prose with H2 sections, inline `<a>` links to riders/disciplines
- Sidebar: featured riders card, related pages card, tags card

**Related articles strip:** 3-card grid linking to other articles

**Back nav:** Category hub → News hub → Riders → Build Team

---

## Categories

| ID | Display | Disc | Hub URL |
|----|---------|------|---------|
| `reining` | Reining | reining | `/news/reining` |
| `cow-horse` | Cow Horse | cow-horse | `/news/cow-horse` |
| `cutting` | Cutting | cutting | `/news/cutting` |
| `fantasy-tips` | Fantasy Strategy | — | `/news` |
| `event-coverage` | Event Coverage | — | `/news` |
| `western-sports` | Western Sports | — | `/news` |
| `rider-profiles` | Rider Profiles | — | `/news` |

---

## Future CMS Migration Path

**Phase 1 (current):** Python dict → static HTML via generate_articles.py  
**Phase 2:** Markdown files in `/content/articles/{slug}.md` → same generator reads front matter  
**Phase 3:** Sanity/Contentful API → generator fetches at build time → same HTML output  
**Phase 4:** Supabase `articles` table → Cloudflare Worker serves article JSON → optional SSR

The page template in `generate_articles.py:build_page()` is the canonical template. Future CMS integrations replace the data source, not the template.
