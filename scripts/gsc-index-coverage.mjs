/**
 * Index-coverage export — which URLs Google has NOT indexed, and why.
 *
 * Read-only. Nothing on the site is touched.
 *
 * Note on method: the Search Console API has no endpoint that dumps the
 * Index Coverage report. The only programmatic route is the URL Inspection
 * API, one URL at a time, so this script reconstructs the report by
 * inspecting every URL it can enumerate:
 *
 *   1. every URL in the live sitemap
 *   2. every URL that drew an impression in the last 3 months, both hosts
 *      (that is what surfaces the apex variants behind "Page with redirect")
 *
 * Anything Google knows about that is in neither set stays invisible — a
 * limit of the API, not of this script. Compare the totals against the GSC
 * UI; a gap means orphan URLs worth chasing.
 *
 * Quota: 2000 inspections/day, 600/min. ~250 URLs is comfortable.
 *
 * Usage:
 *   node scripts/gsc-index-coverage.mjs
 *
 * Output: logs/gsc-export/index-coverage-<date>.csv
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createSign } from 'crypto';

const PROPERTY = 'sc-domain:signmypdf.io';
const SITEMAP = 'https://www.signmypdf.io/sitemap.xml';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const OUT_DIR = 'logs/gsc-export';
const CONCURRENCY = 5;

/** coverageState → the label used in the Russian GSC UI. Only these four are
 *  "not indexed" reasons the report asks about; everything else is context. */
const REASONS = {
  'Crawled - currently not indexed': 'Просканирована, но пока не проиндексирована',
  'Discovered - currently not indexed': 'Обнаружена, не проиндексирована',
  'Page with redirect': 'Страница с переадресацией',
  'Alternate page with proper canonical tag': 'Вариант страницы с тегом canonical',
  'Duplicate, Google chose different canonical than user': 'Дубликат, Google выбрал другой canonical',
  'Duplicate without user-selected canonical': 'Дубликат без canonical',
  'Excluded by robots.txt': 'Заблокирована в robots.txt',
  'Blocked due to unauthorized request (401)': 'Заблокирована (401)',
  'Not found (404)': 'Не найдена (404)',
  'Soft 404': 'Мягкая 404',
  'URL is unknown to Google': 'Google не знает этот URL',
};
const NOT_INDEXED_ONLY = new Set([
  'Crawled - currently not indexed',
  'Discovered - currently not indexed',
  'Page with redirect',
  'Alternate page with proper canonical tag',
]);

function loadCreds() {
  const env = process.env.GSC_CREDENTIALS;
  if (env) {
    const raw = env.trim().startsWith('{') ? env : Buffer.from(env, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  const p = join(homedir(), '.config/signmypdf/gsc-credentials.json');
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  throw new Error('No GSC credentials');
}

const b64u = (b) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function makeJWT(c) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64u(
    JSON.stringify({
      iss: c.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const s = createSign('RSA-SHA256');
  s.update(data);
  return `${data}.${s.sign(c.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function getToken(c) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: makeJWT(c),
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function perfPages(token, from, to) {
  const r = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: from, endDate: to, dimensions: ['page'], rowLimit: 25000 }),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error(`GSC API: ${JSON.stringify(j.error)}`);
  const map = new Map();
  for (const row of j.rows || []) {
    map.set(row.keys[0], {
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    });
  }
  return map;
}

async function inspect(token, url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: PROPERTY, languageCode: 'en-US' }),
    });
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
      continue;
    }
    const j = await r.json();
    if (j.error) return { url, state: `ERROR ${j.error.code}`, verdict: '' };
    const idx = j.inspectionResult?.indexStatusResult || {};
    return {
      url,
      state: idx.coverageState || 'unknown',
      verdict: idx.verdict || '',
      googleCanonical: idx.googleCanonical || '',
      lastCrawl: idx.lastCrawlTime ? idx.lastCrawlTime.slice(0, 10) : '',
    };
  }
  return { url, state: 'ERROR retries', verdict: '' };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ─── run ────────────────────────────────────────────────────────────────────
const DAY = 86400000;
const END = new Date(Date.now() - 2 * DAY);
const to = END.toISOString().slice(0, 10);
const from = new Date(END.getTime() - 90 * DAY).toISOString().slice(0, 10);

const token = await getToken(loadCreds());

console.log(`Property : ${PROPERTY}`);
console.log(`Perf     : ${from} → ${to}\n`);

const perf = await perfPages(token, from, to);

const sitemapXml = await fetch(SITEMAP).then((r) => r.text());
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const candidates = [...new Set([...sitemapUrls, ...perf.keys()])].sort();
console.log(`Sitemap URLs          : ${sitemapUrls.length}`);
console.log(`URLs with impressions : ${perf.size}`);
console.log(`To inspect (deduped)  : ${candidates.length}\n`);

let done = 0;
const results = await mapLimit(candidates, CONCURRENCY, async (url) => {
  const r = await inspect(token, url);
  done++;
  if (done % 25 === 0) console.log(`  inspected ${done}/${candidates.length}`);
  return r;
});

const byState = new Map();
for (const r of results) byState.set(r.state, (byState.get(r.state) || 0) + 1);

console.log('\nCoverage states found:');
for (const [state, n] of [...byState.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${state}${NOT_INDEXED_ONLY.has(state) ? '   *' : ''}`);
}

const rows = results
  .filter((r) => NOT_INDEXED_ONLY.has(r.state))
  .map((r) => {
    const p = perf.get(r.url) || { clicks: 0, impressions: 0, position: 0 };
    return {
      url: r.url,
      reason: REASONS[r.state] || r.state,
      clicks: p.clicks,
      impressions: p.impressions,
      position: p.impressions ? p.position.toFixed(1) : '',
      googleCanonical: r.googleCanonical,
      lastCrawl: r.lastCrawl,
    };
  })
  .sort((a, b) => a.reason.localeCompare(b.reason, 'ru') || b.impressions - a.impressions);

mkdirSync(OUT_DIR, { recursive: true });

// Full state table alongside the filtered one: the "not indexed" buckets only
// make sense next to what Google says about everything else, and the
// "URL is unknown to Google" bucket is usually the interesting one.
const allPath = join(OUT_DIR, `index-coverage-all-${to}.csv`);
writeFileSync(
  allPath,
  ['url,состояние,причина,клики,показы,позиция,google_canonical,последний_обход',
    ...results
      .map((r) => {
        const perfRow = perf.get(r.url) || { clicks: 0, impressions: 0, position: 0 };
        return { r, perfRow };
      })
      .sort((a, b) => b.perfRow.impressions - a.perfRow.impressions)
      .map(({ r, perfRow }) =>
        [r.url, r.state, REASONS[r.state] || '', perfRow.clicks, perfRow.impressions,
          perfRow.impressions ? perfRow.position.toFixed(1) : '', r.googleCanonical, r.lastCrawl]
          .map(csvCell).join(','),
      )].join('\n') + '\n',
);

const outPath = join(OUT_DIR, `index-coverage-${to}.csv`);
writeFileSync(
  outPath,
  ['url,причина,клики,показы,позиция,google_canonical,последний_обход', ...rows.map((r) =>
    [r.url, r.reason, r.clicks, r.impressions, r.position, r.googleCanonical, r.lastCrawl].map(csvCell).join(','),
  )].join('\n') + '\n',
);

console.log(`\nNot-indexed URLs in CSV: ${rows.length}`);
for (const [reason, n] of Object.entries(
  rows.reduce((acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] || 0) + 1 }), {}),
)) {
  console.log(`  ${String(n).padStart(4)}  ${reason}`);
}
console.log(`\nCSV (не проиндексированные): ${outPath}`);
console.log(`CSV (все состояния):        ${allPath}`);
