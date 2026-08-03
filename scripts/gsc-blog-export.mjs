/**
 * Search Console export — per-page performance for every /blog/ URL.
 *
 * Read-only: queries the Search Analytics API and writes a CSV. It never
 * touches the site, the sitemap or posts.ts.
 *
 * Usage:
 *   node scripts/gsc-blog-export.mjs                  — last 3 months (default)
 *   node scripts/gsc-blog-export.mjs 2026-05-01 2026-08-01
 *
 * Output: logs/gsc-export/blog-pages-<from>_<to>.csv
 *
 * Credentials resolve exactly like scripts/index-pages.mjs:
 *   1. env GSC_CREDENTIALS (raw or base64 JSON)
 *   2. ~/.config/signmypdf/gsc-credentials.json
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createSign } from 'crypto';

const PROPERTY = 'sc-domain:signmypdf.io';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const OUT_DIR = 'logs/gsc-export';
const ROW_LIMIT = 25000;

function loadCreds() {
  const env = process.env.GSC_CREDENTIALS;
  if (env) {
    const raw = env.trim().startsWith('{') ? env : Buffer.from(env, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  const configPath = join(homedir(), '.config/signmypdf/gsc-credentials.json');
  if (existsSync(configPath)) return JSON.parse(readFileSync(configPath, 'utf8'));
  throw new Error('No GSC credentials found (env GSC_CREDENTIALS or ~/.config/signmypdf/gsc-credentials.json)');
}

const b64u = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function makeJWT(c) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64u(
    JSON.stringify({
      iss: c.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const data = `${head}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(data);
  const sig = signer.sign(c.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${data}.${sig}`;
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

async function query(token, body) {
  const r = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error(`API error: ${JSON.stringify(j.error)}`);
  return j.rows || [];
}

const csvCell = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const [argFrom, argTo] = process.argv.slice(2);
// GSC data lags ~2 days; end the window yesterday so the last bucket isn't partial.
const today = new Date();
const to = argTo || new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10);
const from = argFrom || new Date(new Date(to).getTime() - 90 * 86400000).toISOString().slice(0, 10);

const creds = loadCreds();
const token = await getToken(creds);

console.log(`Property : ${PROPERTY}`);
console.log(`Range    : ${from} → ${to}\n`);

const rows = await query(token, {
  startDate: from,
  endDate: to,
  dimensions: ['page'],
  rowLimit: ROW_LIMIT,
});

const blog = rows
  .filter((r) => r.keys[0].includes('/blog/'))
  .map((r) => ({
    url: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }))
  .sort((a, b) => b.impressions - a.impressions);

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `blog-pages-${from}_${to}.csv`);
const csv = [
  'url,clicks,impressions,ctr_percent,avg_position',
  ...blog.map((r) =>
    [csvCell(r.url), r.clicks, r.impressions, (r.ctr * 100).toFixed(2), r.position.toFixed(1)].join(','),
  ),
].join('\n');
writeFileSync(outPath, csv + '\n');

const totals = blog.reduce(
  (acc, r) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions }),
  { clicks: 0, impressions: 0 },
);

console.log(`Blog URLs with at least 1 impression : ${blog.length}`);
console.log(`Total clicks                         : ${totals.clicks}`);
console.log(`Total impressions                    : ${totals.impressions}`);
console.log(`Zero-click URLs                      : ${blog.filter((r) => r.clicks === 0).length}`);
console.log(`Under 50 impressions                 : ${blog.filter((r) => r.impressions < 50).length}`);
console.log(`\nCSV: ${outPath}`);
