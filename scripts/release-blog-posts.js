#!/usr/bin/env node
//
// scripts/release-blog-posts.js
//
// Idempotent: applies the desired state of every blog post based on
// scripts/blog-schedule.json. Run locally to force a sync, or via the
// GitHub Actions cron daily to release posts as their date arrives.
//
// What it does for each post in the schedule:
//
//   If today >= release_date (post is "released"):
//     - Strip the noindex robots meta from blog/<slug>/index.html
//     - Make sure the URL is in sitemap.xml
//     - Make sure the visible card is in news/index.html
//     - Make sure the JSON-LD ItemList has the entry
//
//   If today < release_date (post is "scheduled"):
//     - Add noindex/nofollow robots meta to blog/<slug>/index.html
//     - Update visible date + JSON-LD datePublished + og:article date
//       to match the release date (so when it's released, dates match)
//     - Remove from sitemap.xml
//     - Remove from news/index.html visible card + JSON-LD
//
// Posts not in the schedule are not touched.
//
// Usage:
//   node scripts/release-blog-posts.js          # apply state, write files
//   node scripts/release-blog-posts.js --dry    # show what would change

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), '..')

const DRY = process.argv.includes('--dry')
const TODAY = new Date().toISOString().slice(0, 10)

const schedule = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/blog-schedule.json'), 'utf8'),
)

// Drop comment-style keys
const entries = Object.entries(schedule).filter(([k]) => !k.startsWith('_'))

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}
function write(rel, content) {
  if (DRY) {
    console.log(`  [dry] would write ${rel}`)
    return
  }
  fs.writeFileSync(path.join(ROOT, rel), content)
}

function formatHumanDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[m - 1]} ${d}, ${y}`
}

const NOINDEX_TAG = '<meta name="robots" content="noindex, nofollow" />'

function applyPostState(slug, releaseDate, isReleased) {
  const rel = `blog/${slug}/index.html`
  const fullPath = path.join(ROOT, rel)
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ! ${slug}: file missing, skipping`)
    return null
  }
  let html = read(rel)
  let touched = false

  // 1. Update visible date in article-byline
  const human = formatHumanDate(releaseDate)
  const newHtml = html.replace(
    /(<div class="article-byline">By <strong>Climer HQ<\/strong> · Published )[^·]+( ·)/,
    `$1${human}$2`,
  )
  if (newHtml !== html) { html = newHtml; touched = true }

  // 2. Update JSON-LD datePublished + dateModified
  const jsonLdNew = html
    .replace(/"datePublished":"[^"]+"/g, `"datePublished":"${releaseDate}"`)
    .replace(/"dateModified":"[^"]+"/g, `"dateModified":"${releaseDate}"`)
  if (jsonLdNew !== html) { html = jsonLdNew; touched = true }

  // 3. Update OG article:published_time
  const ogNew = html.replace(
    /<meta property="article:published_time" content="[^"]+" \/>/,
    `<meta property="article:published_time" content="${releaseDate}" />`,
  )
  if (ogNew !== html) { html = ogNew; touched = true }

  // 4. Apply or remove noindex meta
  const hasNoindex = html.includes('noindex, nofollow')
  if (isReleased && hasNoindex) {
    html = html.replace(new RegExp('\\s*' + NOINDEX_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    touched = true
  } else if (!isReleased && !hasNoindex) {
    // Insert right after the canonical link
    html = html.replace(
      /(<link rel="canonical"[^>]*\/>)/,
      `$1\n  ${NOINDEX_TAG}`,
    )
    touched = true
  }

  if (touched) write(rel, html)
  return touched
}

// ---- sitemap.xml ----
function ensureSitemapUrls(releasedSlugs) {
  let xml = read('sitemap.xml')
  let touched = false

  // Build the desired set of /blog/<slug> URLs
  const desired = new Set(releasedSlugs.map((s) => `https://climer.ai/blog/${s}`))

  // Strip every existing /blog/ entry, then re-add the desired ones in
  // schedule order. Keeps the file deterministic.
  const blogEntryRe = /\s*<url>\s*<loc>https:\/\/climer\.ai\/blog\/[^<]+<\/loc>[^<]*<changefreq>[^<]+<\/changefreq>[^<]*<priority>[^<]+<\/priority>\s*<\/url>/g
  const stripped = xml.replace(blogEntryRe, '')
  if (stripped !== xml) touched = true
  xml = stripped

  // Insert the desired entries before </urlset>
  if (desired.size > 0) {
    const block = [...desired]
      .map((url) => `  <url>\n    <loc>${url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`)
      .join('\n')
    const newXml = xml.replace(/(\s*)<\/urlset>/, `\n${block}$1</urlset>`)
    if (newXml !== xml) { xml = newXml; touched = true }
  }

  if (touched) write('sitemap.xml', xml)
  return touched
}

// ---- news/index.html ----
const POST_META = {
  'what-is-ai-literacy':                { title: 'What is AI literacy? (And why it matters in 2026)', tag: 'Foundations', summary: "AI literacy isn't \"knowing how a transformer works.\" It's the practical ability to use AI tools well, recognize their limits, and turn them into leverage. Here's what that actually means in 2026 — and why a 15–30% wage premium is hanging on it." },
  'chatgpt-vs-claude-vs-gemini':        { title: 'ChatGPT vs Claude vs Gemini: which AI should you use?', tag: 'Tools', summary: "All three are good. None of them is best at everything. Here's a no-spin breakdown of where each one wins, where each one loses, and the smart-money play: stack them." },
  'use-ai-for-homework-without-cheating': { title: 'How to use AI for homework without cheating', tag: 'Students', summary: "There's a smart way to use AI for school and a dumb way. The smart way teaches you the material faster than working alone. The dumb way ends in a zero and a parent meeting. Here's the line." },
  'how-to-write-a-chatgpt-prompt':      { title: "How to write a ChatGPT prompt that doesn't waste your time", tag: 'Skills', summary: "The 3-part formula — instruction, context, format — that separates good prompts from bad ones. Plus the iteration moves and the role frame that 10x your output quality." },
  'ai-tools-for-teachers':              { title: 'AI in the classroom: 7 free tools every teacher should know', tag: 'Educators', summary: "A practical guide for K–12 teachers in 2026: 7 free tools that save real prep time, plus how to teach AI literacy in a class period without a curriculum." },
  'how-to-teach-kids-ai':               { title: 'How to teach your kid to use AI (without losing your mind)', tag: 'Parents', summary: "A direct guide for parents who want their kids fluent in AI without learning to cheat. What to teach, what to avoid, and what schools won't cover until it's too late." },
  'is-chatgpt-safe-for-kids':           { title: 'Is ChatGPT safe for kids? An honest answer for parents in 2026', tag: 'Parents', summary: "The straight answer on real risks, what age limits mean, and the four things to set up before handing it over. No fearmongering, no marketing." },
  'chatgpt-for-school':                 { title: 'The honest guide to using ChatGPT for school in 2026', tag: 'Students', summary: "What teachers can actually spot, what counts as smart use, what's cheating, and the workflow that makes you better — not lazier." },
  'best-free-ai-tools-for-students-2026': { title: 'Best free AI tools for students in 2026', tag: 'Students', summary: 'ChatGPT, Claude, and Gemini sorted by job-to-be-done — plus the lesser-known free tools worth your homework time. No fluff, no affiliate spin.' },
  'ai-cover-letter':                    { title: "The AI cover letter that doesn't sound like a robot wrote it", tag: 'Career', summary: "Most AI cover letters reek of AI. The 5-step workflow that uses ChatGPT to draft fast and you to keep it human — so hiring managers don't smell it from a mile away." },
  'spot-chatgpt-hallucinations':        { title: 'How to spot ChatGPT hallucinations before they bite you', tag: 'Skills', summary: 'Six fast tests for catching AI hallucinations — fake citations, made-up stats, fabricated quotes — before you embarrass yourself or your team.' },
  'will-ai-take-my-job':                { title: "Will AI take my job? Here's what the data actually says", tag: 'Career', summary: "Brookings's exposure-not-replacement frame, the Anthropic wage-premium data, and what to actually do this year if you don't want to be on the wrong side of the gap." },
  'ai-wage-premium':                    { title: 'The AI wage premium: 15–30% more for the same job', tag: 'Career', summary: "What the Anthropic Economic Index actually says about who's earning more, who's losing ground, and the concrete moves to capture the premium yourself." },
}

function buildBlogCard(slug, releaseDate) {
  const meta = POST_META[slug]
  if (!meta) return null
  const human = formatHumanDate(releaseDate)
  return `        <a class="news-card" href="/blog/${slug}" style="text-decoration: none;">
          <div class="news-card-meta">
            <div class="news-card-source"><span class="news-card-dot" style="background: #C8F53C;"></span><span>Climer HQ · ${meta.tag}</span></div>
            <span>${human}</span>
          </div>
          <h2 class="news-card-title">${meta.title}</h2>
          <p class="news-card-body">${meta.summary}</p>
          <div class="news-card-foot">
            <span class="news-card-tag tag-opp">Long read</span>
            <span class="news-card-link">Read on Climer →</span>
          </div>
        </a>`
}

function ensureNewsGrid(releasedEntries) {
  let html = read('news/index.html')
  let touched = false

  // 1. Replace the visible "From Climer HQ" cards block.
  // The block lives between <div class="section-eyebrow">📝 From Climer HQ</div>
  // and <div class="section-eyebrow">📡 News from the AI economy</div>.
  const sortedDesc = [...releasedEntries].sort((a, b) => b[1].localeCompare(a[1])) // newest first
  const cards = sortedDesc
    .map(([slug, date]) => buildBlogCard(slug, date))
    .filter(Boolean)
    .join('\n\n')

  const cardsBlockRe = /(<div class="section-eyebrow">📝 From Climer HQ<\/div>\s*<div class="news-grid"[^>]*>)([\s\S]*?)(<\/div>\s*<div class="section-eyebrow">📡 News from the AI economy<\/div>)/
  const replacement = `$1\n${cards}\n      $3`
  const newHtml = html.replace(cardsBlockRe, replacement)
  if (newHtml !== html) { html = newHtml; touched = true }

  // 2. Replace the JSON-LD BlogPosting ListItems for blog posts.
  // Strip every BlogPosting list item, then insert the desired ones at the start.
  const jsonLdItemRe = /\s*\{\s*"@type":\s*"ListItem",\s*"position":\s*\d+,\s*"item":\s*\{\s*"@type":\s*"BlogPosting"[\s\S]*?\}\s*\},?/g
  const jsonLdStripped = html.replace(jsonLdItemRe, '')
  if (jsonLdStripped !== html) { html = jsonLdStripped; touched = true }

  // Build new BlogPosting items
  const newItems = sortedDesc.map(([slug, date], i) => {
    const meta = POST_META[slug]
    if (!meta) return null
    return `        { "@type": "ListItem", "position": ${i + 1}, "item": { "@type": "BlogPosting", "headline": ${JSON.stringify(meta.title)}, "url": "https://climer.ai/blog/${slug}", "datePublished": "${date}", "author": { "@type": "Organization", "name": "Climer HQ" }, "publisher": { "@id": "https://climer.ai/#org" } } }`
  }).filter(Boolean).join(',\n')

  // Renumber any remaining (NewsArticle) items to start after our blog items
  const lines = html.split('\n')
  let posCounter = sortedDesc.filter(([s]) => POST_META[s]).length
  const renumbered = lines.map((line) => {
    const m = line.match(/^(.*"position":\s*)\d+(.*)$/)
    if (m) {
      posCounter++
      return `${m[1]}${posCounter}${m[2]}`
    }
    return line
  })
  html = renumbered.join('\n')

  // Insert the new BlogPosting items at the start of the itemListElement array
  const insertRe = /("itemListElement":\s*\[)/
  const beforeInsert = html
  html = html.replace(insertRe, (m) => {
    const blogSection = newItems ? `\n${newItems},` : ''
    return `${m}${blogSection}`
  })
  if (html !== beforeInsert) touched = true

  if (touched) write('news/index.html', html)
  return touched
}

// ── main ──
console.log(`Today: ${TODAY}${DRY ? '  (dry run)' : ''}\n`)

const releasedEntries = []
const scheduledEntries = []

for (const [slug, date] of entries) {
  const isReleased = date <= TODAY
  if (isReleased) releasedEntries.push([slug, date])
  else scheduledEntries.push([slug, date])
}

console.log(`Released (${releasedEntries.length}):`)
for (const [slug, date] of releasedEntries) console.log(`  ${date}  ${slug}`)
console.log(`\nScheduled (${scheduledEntries.length}):`)
for (const [slug, date] of scheduledEntries) console.log(`  ${date}  ${slug}`)
console.log()

let postsTouched = 0
for (const [slug, date] of entries) {
  const isReleased = date <= TODAY
  const touched = applyPostState(slug, date, isReleased)
  if (touched) postsTouched++
}

const sitemapTouched = ensureSitemapUrls(releasedEntries.map(([s]) => s))
const newsTouched = ensureNewsGrid(releasedEntries)

console.log(`\nPosts touched: ${postsTouched}`)
console.log(`Sitemap touched: ${sitemapTouched ? 'yes' : 'no'}`)
console.log(`News page touched: ${newsTouched ? 'yes' : 'no'}`)
