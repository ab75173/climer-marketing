# scripts/

## seo-ideas.js

Pulls 28 days of Search Console performance data for `climer.ai` and
prints three buckets of opportunities:

- **Striking distance** — queries on page 2 (positions 8–20) with real
  volume. A dedicated post or title rewrite usually pushes them to page 1.
- **Low-CTR top results** — queries already in the top 5 but with CTR
  below 4%. Almost always a title/meta-description problem; easy to fix.
- **New keyword targets** — queries the site gets impressions for that
  don't map to any dedicated page yet. Candidates for new blog posts.

### Run it

```sh
npm install
npm run seo-ideas
```

Output prints to the terminal and writes to `scripts/seo_opportunities.json`.

### One-time setup: Search Console API access

You need a Google Cloud service account with read access to the
Search Console property. Takes about 5 minutes.

1. **Create a Google Cloud project** (or use an existing one) at
   https://console.cloud.google.com/projectcreate
2. **Enable the Search Console API**:
   https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
   → click **Enable** with your project selected.
3. **Create a service account**:
   https://console.cloud.google.com/iam-admin/serviceaccounts
   → **Create Service Account** → name it something like `climer-seo` →
   skip role granting (we'll grant via Search Console) → **Done**.
4. **Download a JSON key** for that service account:
   click the service account → **Keys** tab → **Add key** → **JSON** →
   downloads a file like `climer-xxx.json`.
5. **Save the key** as `scripts/.gsc-service-account.json` in this repo.
   It's gitignored — don't commit it.
6. **Grant the service account access to Search Console**:
   - Open https://search.google.com/search-console
   - Pick the `climer.ai` property
   - **Settings** → **Users and permissions** → **Add user**
   - Email = the service account email (looks like
     `climer-seo@your-project.iam.gserviceaccount.com`, in the JSON key file)
   - Permission = **Restricted** (read-only is enough)
7. **Run** `npm run seo-ideas`.

### Tweaking thresholds

Edit `CONFIG.thresholds` in `seo-ideas.js`:

- `strikingDistance.minImpressions` — raise to filter noise, lower to see more candidates
- `lowCTRTop5.ctrMax` — raise to surface more "could be better" titles
- `newKeyword.minImpressions` — raise to surface only meaningful gaps

### Adding new pages

When you ship a new page (blog post, news mirror, etc.), add its path
to `CONFIG.knownPages` in `seo-ideas.js` so the "new keyword" bucket
doesn't keep flagging queries that landed on it.

### Note on first run

Search Console data lags real traffic by ~2 days. If verification was
recent (1–7 days), the script will print "no data yet" — that's normal.
Come back in a week.

## .gitignore

`.gsc-service-account.json` is gitignored at the repo root. Don't
disable that. Don't commit credentials. If you accidentally do,
revoke the key in Google Cloud Console immediately and create a new one.
