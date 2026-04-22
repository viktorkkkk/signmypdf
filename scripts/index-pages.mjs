/**
 * Google Indexing API — submit all signmypdf.io pages for indexing
 *
 * Prerequisites:
 *   1. Service account must be added to Google Search Console as an Owner
 *      (GSC → Settings → Users and permissions → Add user → Owner)
 *      Email: signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com
 *
 * Run:
 *   node scripts/index-pages.mjs
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';

const CREDENTIALS_PATH = './signmypdf-seo-97022bc5390f.json';
const BASE_URL = 'https://signmypdf.io';

const URLS = [
  BASE_URL + '/',
  BASE_URL + '/fill',
  BASE_URL + '/blog',
  BASE_URL + '/privacy',
  BASE_URL + '/terms',
  // Blog posts
  BASE_URL + '/blog/how-to-sign-pdf-online',
  BASE_URL + '/blog/sign-pdf-free-without-registration',
  BASE_URL + '/blog/how-to-add-signature-to-pdf',
  BASE_URL + '/blog/sign-pdf-on-iphone-free',
  BASE_URL + '/blog/sign-pdf-on-mac',
  BASE_URL + '/blog/sign-pdf-android-free',
  BASE_URL + '/blog/sign-pdf-windows-free',
  BASE_URL + '/blog/sign-pdf-without-adobe',
  BASE_URL + '/blog/sign-pdf-no-watermark',
  BASE_URL + '/blog/sign-pdf-fast-secure',
  BASE_URL + '/blog/how-to-sign-lease-agreement-online',
  BASE_URL + '/blog/how-to-sign-nda-online',
  BASE_URL + '/blog/docusign-alternative-free',
  BASE_URL + '/blog/fill-pdf-form-online-free',
  BASE_URL + '/blog/signmypdf-vs-docusign-freelancers',
  BASE_URL + '/blog/real-estate-agents-sign-documents',
  BASE_URL + '/blog/fill-w9-form-online-free',
  BASE_URL + '/blog/electronic-signature-legal-rental',
  BASE_URL + '/blog/sign-nda-online-without-printing',
  BASE_URL + '/blog/pdf-wont-let-me-type-fix',
  BASE_URL + '/blog/ilovepdf-vs-signmypdf',
  BASE_URL + '/blog/fill-irs-form-online-free',
  BASE_URL + '/blog/freelancers-sign-contracts-free',
  BASE_URL + '/blog/electronic-signature-laws-by-state',
  BASE_URL + '/blog/sign-employment-offer-letter-online',
  BASE_URL + '/blog/hr-teams-collect-signatures',
  BASE_URL + '/blog/esign-act-explained',
];

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
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
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
