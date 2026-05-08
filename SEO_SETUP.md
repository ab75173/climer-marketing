# SEO setup for climer.ai

What's already built into the site:

- ✅ `<title>`, `<meta description>`, keywords, robots
- ✅ Canonical URL (`<link rel="canonical">`)
- ✅ Open Graph + Twitter card metadata
- ✅ Structured data (JSON-LD): Organization, WebSite, WebApplication, FAQPage
- ✅ Visible FAQ section matching the FAQ schema
- ✅ `robots.txt` allowing all crawlers + linking to sitemap
- ✅ `sitemap.xml` listing climer.ai and app.climer.ai
- ✅ `manifest.json` for PWA installability
- ✅ `theme-color` for browser chrome
- ✅ SVG favicon and Apple touch icon
- ✅ OG image (SVG)

## Manual steps (only you can do these — they need your accounts)

### 1. Verify the domain in Google Search Console

1. Go to https://search.google.com/search-console
2. Click **Add Property** → **Domain** → enter `climer.ai`
3. Google gives you a TXT record. Add it to Cloudflare DNS:
   - Type: `TXT`
   - Name: `@` (root)
   - Content: the value Google provides (starts with `google-site-verification=...`)
   - Proxy: DNS only
4. Back in Search Console, click **Verify**
5. Once verified, go to **Sitemaps** → add `https://climer.ai/sitemap.xml`

This tells Google to crawl and index the site. First indexing usually takes 1–7 days.

### 2. Bing Webmaster Tools (optional but easy)

1. Go to https://www.bing.com/webmasters
2. Sign in with a Microsoft account
3. **Add a site** → enter `https://climer.ai/`
4. Choose **Import from Google Search Console** (fastest) or verify via DNS
5. Submit `https://climer.ai/sitemap.xml`

### 3. Convert OG image to PNG (recommended)

Twitter and some other platforms don't render SVG OG images. To get a real card preview:

1. Open `og-image.svg` in any tool that exports PNG (Figma, Sketch, browser screenshot, https://realfavicongenerator.net)
2. Export at exactly 1200×630
3. Save as `og-image.png` in the repo root
4. Update `index.html` to reference `og-image.png` instead of `og-image.svg` (two spots)

### 4. Generate proper iOS app icons (recommended)

iOS home-screen icon currently uses the SVG. iOS supports SVG only spottily — for a polished install:

1. Visit https://realfavicongenerator.net/
2. Upload `icon.svg`
3. Generate and download the icon pack
4. Drop the PNGs (`apple-touch-icon.png`, `favicon-32x32.png`, `favicon-16x16.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`) into the repo root
5. Replace the manifest icon entries with the PNG paths

### 5. Optional: add Google Analytics or PostHog

Useful for seeing what brings traffic and what people read. Drop the snippet just before `</head>` in `index.html`.

## What good looks like (tracking metrics)

- **Indexing**: Search Console → Coverage shows climer.ai indexed (1–7 days after submission)
- **Rich results**: Search Console → Enhancements shows FAQ rich results detected
- **Core Web Vitals**: Lighthouse score 90+ on all four (it should be — single static HTML)
- **Voice search**: Asking Google Assistant or Siri "what is climer.ai" should pull from the description / FAQ
- **Social cards**: Pasting `https://climer.ai` into iMessage / Slack / Discord shows a card with the OG image

## Testing

- **Rich results test**: https://search.google.com/test/rich-results — paste `https://climer.ai/` to verify FAQ schema is detected
- **Open Graph debugger**: https://opengraph.xyz/url/https%3A%2F%2Fclimer.ai — see exactly how the link card renders
- **Lighthouse**: Chrome DevTools → Lighthouse → run an audit on https://climer.ai
