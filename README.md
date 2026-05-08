# Climer — marketing site

**Live:** https://climer.ai
**App (separate repo):** https://app.climer.ai · [`climer`](https://github.com/ab75173/climer)

Public-facing marketing site for Climer — the mobile-first AI literacy
product. The site's job is to (a) explain what Climer is to anyone who
lands on a Google result, (b) drive sign-ups to the app, and (c) host
SEO-targeted long-form content that pulls organic traffic.

The actual learning experience lives behind auth at `app.climer.ai`,
which is a separate Vite/React SPA in its own repo.

## Pages

| URL | What it is |
|---|---|
| `/` | Hero / stats / how-it-works / route cards / why-now / audience / CTA |
| `/news` | Unified feed: 3 long-form Climer HQ posts + 6 curated AI-economy news cards |
| `/blog/<slug>` | Individual long-form posts (3 starters live; more added over time) |
| `/contact` | FAQ + contact-routing cards |
| `/accessibility` | (planned) WCAG 2.1 AA conformance statement |
| `/privacy` | (planned) Privacy policy |
| `/sitemap.xml` | Crawler sitemap |
| `/robots.txt` | Crawl rules |
| `/manifest.json` | PWA manifest (installable to phone home screen) |

## Tech stack

| Layer | What |
|---|---|
| Format | **Pure static HTML** — one file per page, no framework, no build step |
| Styling | **Vanilla CSS** in `styles.css` (shared by every page); CSS custom properties for tokens |
| Fonts | **Fraunces 600** (display) + **Outfit** (body), via Google Fonts |
| Icons | Inline SVG (`icon.svg`, `og-image.svg`) |
| Hosting | **Vercel** (separate project from the app; auto-deploys from `main`) |
| Analytics | **Vercel Analytics** (toggled on in dashboard) |
| SEO tooling | **Search Console API** via `scripts/seo-ideas.js` |

Why no framework: the site is content-first and rarely changes
layout. Static HTML loads in tens of milliseconds, scores 100 on
Lighthouse, and has zero build pipeline to babysit. The
SEO ROI is in fast load times, structured data, and frequent
high-quality content — not in component frameworks.

## Local preview

The site is static, so any HTTP server works:

```sh
# Python (already installed on macOS)
python3 -m http.server 8000

# or Node, if you prefer
npx serve .
```

Then open http://localhost:8000.

## SEO scaffolding

The site ships with the full set of SEO + voice-search basics:

- `<title>`, `<meta description>`, canonical, Open Graph, Twitter Card
- JSON-LD structured data on every page:
  - Home: `Organization`, `WebSite`, `WebApplication`
  - `/news`: `CollectionPage` + `ItemList` with mixed `BlogPosting`
    and `NewsArticle` items
  - `/blog/<slug>`: `BlogPosting` + `BreadcrumbList`
  - `/contact`: `FAQPage` (matched by visible `<details>` content)
- `robots.txt` + `sitemap.xml`
- PWA `manifest.json` so `climer.ai` is installable as an app
- Theme color, color scheme, and Apple touch icon

The full list of "what's automatic vs. what needs you" is in
**[SEO_SETUP.md](./SEO_SETUP.md)** — covers Search Console
verification, Bing Webmaster Tools, OG image PNG conversion,
proper iOS icon generation, and analytics options.

## SEO ideas script

`scripts/seo-ideas.js` pulls 28 days of Search Console data via the
Google Search Console API and surfaces three buckets of opportunities:

1. **Striking distance** — queries on page 2 (positions 8–20) with real
   volume; usually a dedicated post or title rewrite pushes them to
   page 1.
2. **Low-CTR top results** — top-5 positions with CTR below 4%; almost
   always a title/meta-description fix.
3. **New keyword targets** — queries getting impressions but with no
   dedicated page yet; candidates for new blog posts.

Setup walkthrough (Google Cloud service account, Search Console user
add, etc.) is in **[scripts/README.md](./scripts/README.md)**.
Ignore until Search Console has 1+ week of data.

```sh
npm install
npm run seo-ideas
# → prints summary + writes scripts/seo_opportunities.json
```

## Project layout

```
.
├── index.html                  # Home (hero, stats, routes, why-now, who, CTA)
├── styles.css                  # Shared styles for every page
├── news/index.html             # Mixed news + blog feed
├── contact/index.html          # FAQ + contact-routing cards
├── blog/
│   ├── what-is-ai-literacy.html
│   ├── chatgpt-vs-claude-vs-gemini.html
│   └── use-ai-for-homework-without-cheating.html
├── icon.svg                    # Brand mountain mark (favicon, app icon)
├── og-image.svg                # 1200×630 share card (TODO: PNG variant)
├── manifest.json               # PWA manifest
├── robots.txt
├── sitemap.xml
├── package.json                # Only for the SEO script's deps; no build
├── scripts/
│   ├── seo-ideas.js            # Search Console API → article ideas
│   ├── news_sources.json       # (Reserved) RSS feed config
│   ├── README.md               # Service-account setup walkthrough
│   └── .gsc-service-account.json    # gitignored — never commit
├── SEO_SETUP.md                # Full SEO setup guide
└── README.md                   # This file
```

## Routing notes

Vercel resolves clean URLs from folder-pattern files. `/news` →
`/news/index.html`, `/contact` → `/contact/index.html`. **Don't put
HTML files at the repo root other than `index.html`** — top-level
`.html` files don't always strip the extension cleanly on this Vercel
project. Use a folder + `index.html` instead.

## Domain & DNS

- `climer.ai` → A record at Cloudflare → `76.76.21.21` (Vercel anycast),
  DNS only (gray cloud).
- `www.climer.ai` → CNAME at Cloudflare → `cname.vercel-dns.com`,
  DNS only.
- Vercel project is set up so `climer.ai` is the primary; `www`
  redirects to root.

## Editing copy

Each page is one self-contained HTML file with its `<head>` (meta tags,
schema, font preconnects), nav, content, and footer. To change copy, edit
the file and push — Vercel rebuilds in seconds. Shared styles live in
`styles.css`. New blog posts are a new file in `blog/` plus an entry
on `/news` and `sitemap.xml`.

## License / status

Private MVP. Not open-sourced yet.
