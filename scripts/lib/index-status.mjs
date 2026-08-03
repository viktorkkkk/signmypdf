/**
 * How many of the site's URLs Google actually has in its index.
 *
 * Counting this costs one URL Inspection call per URL (~207 today), so the
 * result is cached in logs/index-status.json and only refreshed when the
 * cache is older than MAX_AGE_DAYS. Both reports read it; the weekly run is
 * what normally pays for the refresh.
 *
 * The cache also carries the previous count, which is what lets a report say
 * "the index shrank" instead of just printing a number.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const PROPERTY = 'sc-domain:signmypdf.io';
const SITEMAP = 'https://www.signmypdf.io/sitemap.xml';
const CACHE_PATH = join(process.cwd(), 'logs', 'index-status.json');
const MAX_AGE_DAYS = 7;
const CONCURRENCY = 5;

/** coverageState values that mean "this URL is in the index". */
const INDEXED_STATES = new Set(['Submitted and indexed', 'Indexed, not submitted in sitemap']);

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
    if (j.error) return null;
    return j.inspectionResult?.indexStatusResult?.coverageState || 'unknown';
  }
  return null;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

function readCache() {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{indexed:number,total:number,previousIndexed:number|null,checkedAt:string,refreshed:boolean}|null>}
 *   null when the count could not be established at all — callers should then
 *   print nothing rather than a wrong number.
 */
export async function getIndexStatus(token, { force = false } = {}) {
  const cached = readCache();
  const ageDays = cached ? (Date.now() - new Date(cached.checkedAt).getTime()) / 86400000 : Infinity;
  if (cached && !force && ageDays < MAX_AGE_DAYS) {
    return { ...cached, refreshed: false };
  }

  let urls;
  try {
    const xml = await fetch(SITEMAP).then((r) => r.text());
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  } catch {
    return cached ? { ...cached, refreshed: false } : null;
  }
  if (!urls.length) return cached ? { ...cached, refreshed: false } : null;

  const states = await mapLimit(urls, CONCURRENCY, (u) => inspect(token, u));
  const answered = states.filter((s) => s !== null);
  // A run where most calls failed would report a fake collapse in indexing.
  if (answered.length < urls.length * 0.8) {
    return cached ? { ...cached, refreshed: false } : null;
  }

  const indexed = states.filter((s) => s && INDEXED_STATES.has(s)).length;
  const next = {
    indexed,
    total: urls.length,
    previousIndexed: cached ? cached.indexed : null,
    checkedAt: new Date().toISOString(),
  };

  try {
    mkdirSync(join(process.cwd(), 'logs'), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(next, null, 2) + '\n');
  } catch {
    // A read-only checkout still gets a correct number this run.
  }
  return { ...next, refreshed: true };
}

export { CACHE_PATH };
