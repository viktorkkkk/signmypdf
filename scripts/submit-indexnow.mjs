/**
 * IndexNow bulk submission — submits signmypdf.io URLs to Bing
 * (and the shared IndexNow API endpoint, which fans out to Yandex /
 * Seznam / other participants).
 *
 * Key file: https://www.signmypdf.io/8e0aa4aa055ef1d076ab294fd8edb9ba.txt
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs                 — submit every static
 *                                                       URL + every slug
 *                                                       in apps/web/app/blog/posts.ts
 *   node scripts/submit-indexnow.mjs slug1 slug2     — submit only those
 *                                                       blog slugs (still
 *                                                       includes statics)
 *
 * Static URLs are listed below. Blog slugs are read live from
 * `apps/web/app/blog/posts.ts` so newly-published articles are picked up
 * automatically (mirrors `scripts/index-pages.mjs` for Google). Until
 * 2026-05-22 this script carried a hand-maintained `BLOG_SLUGS` array,
 * which silently fell behind every time the daily blog trigger added a
 * new slug — that gap was the root cause of Bing's "not all recent blog
 * pages submitted via IndexNow" warning.
 */

import { readFileSync } from 'fs';

// Canonical host is www. apex (signmypdf.io) 307-redirects to www, so
// IndexNow submissions on apex make Bing follow a redirect for every URL.
// Bing sometimes treats the redirected URL as a separate signal entirely
// — submit www directly to avoid that.
const HOST = 'www.signmypdf.io';
const KEY  = '8e0aa4aa055ef1d076ab294fd8edb9ba';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Static public pages on the site. Keep this list in sync with
// `apps/web/app/sitemap.ts` STATIC_URLS — the sitemap is the SEO
// canonical source of truth, this list is the IndexNow shadow of it.
const STATIC_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/sign`,
  `https://${HOST}/fill`,
  `https://${HOST}/protect`,
  `https://${HOST}/merge`,
  `https://${HOST}/compress`,
  `https://${HOST}/split`,
  `https://${HOST}/sign-nda`,
  `https://${HOST}/sign-pdf-chrome-extension`,
  `https://${HOST}/extension/privacy`,
  `https://${HOST}/extension/support`,
  `https://${HOST}/blog`,
  `https://${HOST}/privacy`,
  `https://${HOST}/terms`,
];

// Read all slugs dynamically from posts.ts so this script never falls
// behind the actual published set.
function getAllSlugsFromPosts() {
  const content = readFileSync('./apps/web/app/blog/posts.ts', 'utf8');
  const matches = [...content.matchAll(/slug:\s*['"]([^'"]+)['"]/g)];
  return matches
    .map(m => m[1])
    .filter(s => s !== 'string'); // filter out the type declaration in BlogPost
}

const cliSlugs = process.argv.slice(2);
const slugs = cliSlugs.length > 0 ? cliSlugs : getAllSlugsFromPosts();
const BLOG_URLS = slugs.map(slug => `https://${HOST}/blog/${slug}`);
const ALL_URLS = [...STATIC_URLS, ...BLOG_URLS];

async function submitIndexNow(engine, endpoint) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: ALL_URLS,
  };

  console.log(`\n→ Submitting ${ALL_URLS.length} URLs to ${engine}...`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  if (res.ok || res.status === 200 || res.status === 202) {
    console.log(`✅ ${engine}: ${res.status} — accepted`);
    return { engine, ok: true, status: res.status };
  } else {
    const text = await res.text().catch(() => '');
    console.error(`❌ ${engine}: ${res.status} — ${text}`);
    return { engine, ok: false, status: res.status, body: text };
  }
}

async function main() {
  console.log('IndexNow bulk submission');
  console.log(`Host:    ${HOST}`);
  console.log(`Key:     ${KEY}`);
  console.log(`Source:  ${cliSlugs.length > 0
    ? `${cliSlugs.length} slug(s) from CLI args`
    : `${slugs.length} slugs live from posts.ts`}`);
  console.log(`URLs:    ${ALL_URLS.length} total (${STATIC_URLS.length} static + ${BLOG_URLS.length} blog)\n`);
  ALL_URLS.forEach(u => console.log('  ' + u));

  // Submit to both endpoints — they share data but each acks separately,
  // so submitting to both is the standard way to get fastest pick-up.
  const results = await Promise.all([
    submitIndexNow('Bing',         'https://www.bing.com/indexnow'),
    submitIndexNow('IndexNow API', 'https://api.indexnow.org/indexnow'),
  ]);

  const allOk = results.every(r => r.ok);
  console.log('\nDone. Bing typically processes within 1–4 hours.');
  console.log(`Verify: https://www.bing.com/webmasters/about?siteUrl=https://${HOST}/`);

  if (!allOk) {
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
