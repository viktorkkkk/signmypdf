/**
 * Submit the sitemap index and its children to Search Console, then ping the
 * public sitemap endpoints.
 *
 * Needs the WRITE scope (…/auth/webmasters), unlike the reporting scripts
 * which are read-only.
 *
 * Usage: node scripts/submit-sitemaps.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createSign } from 'crypto';

const PROPERTY = 'sc-domain:signmypdf.io';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const SITE = 'https://www.signmypdf.io';
const SITEMAPS = [
  `${SITE}/sitemap.xml`,
  `${SITE}/sitemap-core.xml`,
  `${SITE}/sitemap-blog-1.xml`,
  `${SITE}/sitemap-blog-2.xml`,
];

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

async function getToken(c) {
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
  const jwt = `${data}.${s.sign(c.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

const token = await getToken(loadCreds());

console.log('Search Console — submit\n');
for (const sm of SITEMAPS) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    PROPERTY,
  )}/sitemaps/${encodeURIComponent(sm)}`;
  const r = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
  console.log(`  ${r.status === 204 ? '✅' : '❌'} HTTP ${r.status}  ${sm}`);
  if (r.status !== 204) console.log(`     ${(await r.text()).slice(0, 200)}`);
}

// Google retired its /ping endpoint in June 2023 and Bing pushed everyone to
// IndexNow; both are called anyway so the result is a fact rather than an
// assumption, and reported verbatim.
console.log('\nPublic sitemap pings (legacy endpoints)\n');
for (const [name, url] of [
  ['Google', `https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE}/sitemap.xml`)}`],
  ['Bing', `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${SITE}/sitemap.xml`)}`],
]) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    console.log(`  ${name}: HTTP ${r.status}${r.status === 200 ? ' — accepted' : ' — endpoint retired, no effect'}`);
  } catch (e) {
    console.log(`  ${name}: request failed — ${e.message}`);
  }
}

console.log('\nCurrent state in Search Console:\n');
const list = await fetch(
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/sitemaps`,
  { headers: { Authorization: `Bearer ${token}` } },
).then((r) => r.json());
for (const s of list.sitemap || []) {
  const submitted = s.lastSubmitted ? s.lastSubmitted.slice(0, 10) : '—';
  const count = (s.contents || []).reduce((n, c) => n + Number(c.submitted || 0), 0);
  console.log(`  ${s.path}\n     type=${s.type || '—'} submitted=${submitted} urls=${count} errors=${s.errors || 0} warnings=${s.warnings || 0}`);
}
