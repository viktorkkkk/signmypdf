/**
 * Google Indexing API — submit signmypdf.io pages for indexing
 *
 * Prerequisites:
 *   1. Service account must be added to Google Search Console as an Owner
 *      (GSC → Settings → Users and permissions → Add user → Owner)
 *      Email: signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com
 *
 * Usage:
 *   node scripts/index-pages.mjs                    — submit all pages (reads slugs from posts.ts)
 *   node scripts/index-pages.mjs slug1 slug2        — submit only specific blog slugs
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createSign } from 'crypto';

// GSC credentials resolution order:
//   1. Env var GSC_CREDENTIALS (raw JSON or base64-encoded JSON) — used by
//      GitHub Actions where the same secret name is mapped from repo secrets.
//   2. ~/.config/signmypdf/gsc-credentials.json — local dev path.
//   3. ./signmypdf-seo-97022bc5390f.json — repo fallback (gitignored), used
//      by the daily RemoteTrigger which writes a temp copy at runtime.
const CONFIG_PATH = join(homedir(), '.config/signmypdf/gsc-credentials.json');
const REPO_FALLBACK = './signmypdf-seo-97022bc5390f.json';
const CREDENTIALS_PATH = existsSync(CONFIG_PATH) ? CONFIG_PATH : REPO_FALLBACK;

function loadCredentials() {
  const env = process.env.GSC_CREDENTIALS;
  if (env) {
    const trimmed = env.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    // Otherwise assume base64-encoded JSON
    return JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
  }
  return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
}
// Submit URLs under www (the canonical host). The GSC service account
// (signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com) is
// Owner of the Domain property `sc-domain:signmypdf.io` (added Apr 27)
// which covers BOTH apex and www under one verification — Indexing
// API accepts www URLs directly without a redirect dance.
const BASE_URL = 'https://www.signmypdf.io';

const STATIC_URLS = [
  BASE_URL + '/',
  BASE_URL + '/sign',
  BASE_URL + '/fill',
  BASE_URL + '/protect',
  BASE_URL + '/blog',
  BASE_URL + '/privacy',
  BASE_URL + '/terms',
];

// Read all slugs dynamically from posts.ts
function getAllSlugsFromPosts() {
  const content = readFileSync('./apps/web/app/blog/posts.ts', 'utf8');
  const matches = [...content.matchAll(/slug:\s*['"]([^'"]+)['"]/g)];
  return matches.map(m => m[1]).filter(s => s !== 'string'); // filter out type declarations
}

// Build URL list: if slugs passed as CLI args, use only those; otherwise read all from posts.ts
const cliSlugs = process.argv.slice(2);
let URLS;
if (cliSlugs.length > 0) {
  // Specific slugs passed — submit those + static pages
  URLS = [...STATIC_URLS, ...cliSlugs.map(s => `${BASE_URL}/blog/${s}`)];
} else {
  // No args — submit everything
  const allSlugs = getAllSlugsFromPosts();
  URLS = [...STATIC_URLS, ...allSlugs.map(s => `${BASE_URL}/blog/${s}`)];
}

// --- JWT helpers (no dependencies) ---

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJWT(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const data = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  const sig = sign.sign(credentials.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${data}.${sig}`;
}

async function getAccessToken(credentials) {
  const jwt = makeJWT(credentials);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function notifyUrl(token, url) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  return res.json();
}

// --- Main ---

async function main() {
  const credentials = loadCredentials();
  console.log(`\nService account: ${credentials.client_email}`);
  console.log(`Submitting ${URLS.length} URLs...\n`);

  let token;
  try {
    token = await getAccessToken(credentials);
  } catch (e) {
    console.error('Failed to get access token:', e.message);
    process.exit(1);
  }

  for (const url of URLS) {
    try {
      const result = await notifyUrl(token, url);
      if (result.urlNotificationMetadata) {
        console.log(`✅  ${url}`);
      } else if (result.error) {
        console.log(`❌  ${url} — ${result.error.code} ${result.error.message}`);
      } else {
        console.log(`?   ${url} — ${JSON.stringify(result)}`);
      }
    } catch (e) {
      console.log(`❌  ${url} — ${e.message}`);
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\nDone.');
}

main();
