#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Pull Search Console performance data for climer.ai and surface
 * article opportunities. Three buckets:
 *
 *   1. Striking distance      — queries currently on page 2 (positions 11–20)
 *                               with meaningful impressions. A dedicated post
 *                               or title rewrite often pushes these to page 1.
 *   2. Low-CTR top results    — queries already in the top 5 but with CTR
 *                               below 4%. Usually a title/meta-description
 *                               problem. Easy to fix, big multiplier.
 *   3. New keyword targets    — queries the site is showing for but where
 *                               we have no dedicated page yet. Candidates for
 *                               new blog posts.
 *
 * Usage:
 *
 *   1. Create a Google Cloud service account (one-time setup — see
 *      scripts/README.md for the full walkthrough).
 *   2. Save the JSON key file as scripts/.gsc-service-account.json
 *      (gitignored).
 *   3. Add the service account email as a "Restricted" user in the
 *      Search Console property for climer.ai.
 *   4. Run:
 *
 *        npm install
 *        npm run seo-ideas
 *
 * Output: scripts/seo_opportunities.json with categorized buckets, plus
 * a printed summary.
 *
 * Tweak the thresholds in CONFIG below if the noise level is too high or
 * too low for your taste.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { google } from 'googleapis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CONFIG = {
  siteUrl: 'sc-domain:climer.ai',          // Domain property; use 'https://climer.ai/' for URL-prefix property
  daysBack: 28,                             // 28 days is GSC's default window
  rowLimit: 5000,                           // max queries to pull
  thresholds: {
    strikingDistance: { positionMin: 8, positionMax: 20, minImpressions: 50 },
    lowCTRTop5: { positionMax: 5, ctrMax: 0.04, minImpressions: 100 },
    newKeyword: { minImpressions: 30 },
  },
  // Existing pages on the site. Used to decide whether a query already has
  // dedicated content. Keep this in sync as new pages ship.
  knownPages: [
    '/',
    '/contact',
    '/news',
    '/blog',
    '/blog/what-is-ai-literacy',
    '/blog/chatgpt-vs-claude-vs-gemini',
    '/blog/use-ai-for-homework-without-cheating',
  ],
  credentialsPath: path.join(__dirname, '.gsc-service-account.json'),
  outputPath: path.join(__dirname, 'seo_opportunities.json'),
}

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function loadCredentials() {
  try {
    const raw = await fs.readFile(CONFIG.credentialsPath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.error(
      `\nMissing service account credentials at ${CONFIG.credentialsPath}.\n` +
        `See scripts/README.md for the one-time setup walkthrough.\n`
    )
    throw err
  }
}

async function authClient() {
  const creds = await loadCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  return auth.getClient()
}

async function fetchTopQueries(searchConsole) {
  const today = isoDaysAgo(0)
  const start = isoDaysAgo(CONFIG.daysBack)
  console.log(`Pulling Search Console data for ${CONFIG.siteUrl}\n  ${start} → ${today}\n`)

  const res = await searchConsole.searchanalytics.query({
    siteUrl: CONFIG.siteUrl,
    requestBody: {
      startDate: start,
      endDate: today,
      dimensions: ['query', 'page'],
      rowLimit: CONFIG.rowLimit,
      dataState: 'final',
    },
  })

  return res.data.rows || []
}

function classify(rows) {
  const strikingDistance = []
  const lowCTRTop5 = []
  const newKeyword = []
  const knownSet = new Set(
    CONFIG.knownPages.map((p) => `https://climer.ai${p === '/' ? '' : p}`)
  )

  for (const row of rows) {
    const [query, pageUrl] = row.keys
    const { impressions, clicks, ctr, position } = row
    const t = CONFIG.thresholds

    // Striking distance — page-2 queries with real volume
    if (
      position >= t.strikingDistance.positionMin &&
      position <= t.strikingDistance.positionMax &&
      impressions >= t.strikingDistance.minImpressions
    ) {
      strikingDistance.push({ query, pageUrl, impressions, clicks, ctr, position })
    }

    // Low CTR despite top-5 position — title/meta opportunity
    if (
      position <= t.lowCTRTop5.positionMax &&
      ctr <= t.lowCTRTop5.ctrMax &&
      impressions >= t.lowCTRTop5.minImpressions
    ) {
      lowCTRTop5.push({ query, pageUrl, impressions, clicks, ctr, position })
    }

    // New keyword target — getting impressions but no dedicated page
    const isOnKnownPage = Array.from(knownSet).some((known) =>
      pageUrl.startsWith(known)
    )
    if (impressions >= t.newKeyword.minImpressions && !isOnKnownPage) {
      newKeyword.push({ query, pageUrl, impressions, clicks, ctr, position })
    }
  }

  return {
    strikingDistance: strikingDistance.sort((a, b) => b.impressions - a.impressions).slice(0, 25),
    lowCTRTop5: lowCTRTop5.sort((a, b) => b.impressions - a.impressions).slice(0, 25),
    newKeyword: newKeyword.sort((a, b) => b.impressions - a.impressions).slice(0, 25),
  }
}

function printSummary(buckets) {
  const fmt = (r) =>
    `    ${r.position.toFixed(1).padStart(4)} · ${String(r.impressions).padStart(5)} impr · ${(r.ctr * 100).toFixed(1)}% CTR · ${r.query}`

  console.log('━━━ Striking distance (positions 8–20) ━━━')
  console.log('Push these to page 1 with a dedicated post or title rewrite:\n')
  buckets.strikingDistance.forEach((r) => console.log(fmt(r)))

  console.log('\n━━━ Low CTR despite top-5 position ━━━')
  console.log('Title/meta description rewrites can multiply traffic here:\n')
  buckets.lowCTRTop5.forEach((r) => console.log(fmt(r)))

  console.log('\n━━━ New keyword targets ━━━')
  console.log('Queries getting impressions with no dedicated page yet:\n')
  buckets.newKeyword.forEach((r) => console.log(fmt(r)))
}

async function main() {
  const auth = await authClient()
  const searchConsole = google.searchconsole({ version: 'v1', auth })

  const rows = await fetchTopQueries(searchConsole)
  console.log(`Got ${rows.length} query rows from Search Console.\n`)

  if (rows.length === 0) {
    console.log(
      'No data yet. Search Console typically takes 2–7 days to start populating after verification.\n' +
        'If verification is older than that, double-check that the service account is added as a user on the property.\n'
    )
    return
  }

  const buckets = classify(rows)
  printSummary(buckets)

  await fs.writeFile(
    CONFIG.outputPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), buckets }, null, 2) + '\n',
    'utf-8'
  )
  console.log(`\nWrote full results to ${path.relative(process.cwd(), CONFIG.outputPath)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
