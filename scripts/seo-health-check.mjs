#!/usr/bin/env node
/**
 * Daily SEO health check for signmypdf.io.
 *
 * Reads the live production sitemap and verifies the per-page metadata
 * invariants we hardened in commits e8cc93f / 57e1497 / 5e436f2:
 *
 *   - HTTP 200 OK
 *   - <title> exists and is unique across the sitemap
 *   - <link rel="canonical"> exists and points at the page itself
 *   - <meta property="og:url"> exists and points at the page itself
 *   - <meta name="description"> exists and is 50-160 chars
 *
 * Writes a full JSON report to logs/seo-health/YYYY-MM-DD.json. Exits 0
 * if everything passes, 1 if any invariant is violated, 2 on script-level
 * crash (e.g. sitemap unreachable). The GitHub Action turns a non-zero
 * exit into an Issue tagged `seo-health`.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SITEMAP_URL = 'https://www.signmypdf.io/sitemap.xml';
const DESC_MIN_LEN = 50;
const DESC_MAX_LEN = 160;
const LOGS_DIR = 'logs/seo-health';
const FETCH_CONCURRENCY = 6;

/**
 * Frozen baseline: published blog articles whose metaDescription is
 * slightly over 160 chars but cannot be edited per CLAUDE.md rule #1
 * ("never modify a published article"). These are tracked here so the
 * daily health check stays green and only fires on NEW regressions.
 *
 * Format: { url, kind }. kind ∈ 'description-length' | 'title-duplicate'
 *   | 'description-missing' | 'canonical-mismatch' | 'og-url-mismatch'
 *   | 'http-non-200' | 'fetch-error'.
 *
 * Only add an entry here when the source-of-truth genuinely cannot be
 * fixed (frozen article, intentional redirect, etc.) — NOT to silence
 * fixable bugs.
 */
const ALLOWLIST = [
  { url: 'https://www.signmypdf.io/blog/password-protect-pdf-online-free', kind: 'description-length' },
  { url: 'https://www.signmypdf.io/blog/pdf-form-fields-not-working-fix', kind: 'description-length' },
  { url: 'https://www.signmypdf.io/blog/signmypdf-vs-docusign-freelancers', kind: 'description-length' },
  { url: 'https://www.signmypdf.io/blog/fill-pdf-form-online-free', kind: 'description-length' },
  { url: 'https://www.signmypdf.io/blog/sent-confidential-contract-unprotected', kind: 'description-length' },
];

function isAllowlisted(url, kind) {
  return ALLOWLIST.some((a) => a.url === url && a.kind === kind);
}

function normalizeUrl(u) {
  if (!u) return '';
  // Drop trailing slashes so https://x.com and https://x.com/ compare equal.
  return u.replace(/\/+$/, '').trim();
}

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extract(html, regex) {
  const m = html.match(regex);
  return m ? decodeEntities(m[1]).trim() : null;
}

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    const title = extract(html, /<title>([^<]+)<\/title>/i);
    const canonical = extract(
      html,
      /rel="canonical"[^>]*href="([^"]+)"/i,
    );
    const ogUrl = extract(
      html,
      /property="og:url"[^>]*content="([^"]+)"/i,
    );
    const description = extract(
      html,
      /name="description"[^>]*content="([^"]+)"/i,
    );
    return {
      url,
      finalUrl: res.url,
      status: res.status,
      title,
      canonical,
      ogUrl,
      description,
      descriptionLength: description ? description.length : 0,
    };
  } catch (e) {
    return { url, status: 0, error: e.message };
  }
}

async function checkAllUrls(urls) {
  // Bounded concurrency so we don't hammer the edge with 60+ parallel requests.
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const i = cursor++;
      results[i] = await checkUrl(urls[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, worker),
  );
  return results;
}

function findIssues(results) {
  const issues = [];
  const allowlisted = [];
  const record = (url, kind, msg) => {
    if (isAllowlisted(url, kind)) allowlisted.push(msg);
    else issues.push(msg);
  };

  // Title duplicates (across the whole sitemap).
  const titleCounts = new Map();
  for (const r of results) {
    if (r.title) {
      titleCounts.set(r.title, (titleCounts.get(r.title) ?? 0) + 1);
    }
  }
  const duplicateTitles = new Set();
  for (const [title, count] of titleCounts) {
    if (count > 1) duplicateTitles.add(title);
  }

  for (const r of results) {
    if (r.error) {
      record(r.url, 'fetch-error', `${r.url}: fetch error — ${r.error}`);
      continue;
    }
    if (r.status !== 200) {
      record(r.url, 'http-non-200', `${r.url}: HTTP ${r.status}${r.finalUrl && r.finalUrl !== r.url ? ` (final: ${r.finalUrl})` : ''}`);
    }
    if (!r.title) {
      record(r.url, 'title-missing', `${r.url}: missing <title>`);
    } else if (duplicateTitles.has(r.title)) {
      record(r.url, 'title-duplicate', `${r.url}: title "${r.title}" is duplicated across sitemap`);
    }
    if (!r.canonical) {
      record(r.url, 'canonical-missing', `${r.url}: missing <link rel="canonical">`);
    } else if (normalizeUrl(r.canonical) !== normalizeUrl(r.url)) {
      record(r.url, 'canonical-mismatch', `${r.url}: canonical "${r.canonical}" does not match self`);
    }
    if (!r.ogUrl) {
      record(r.url, 'og-url-missing', `${r.url}: missing <meta property="og:url">`);
    } else if (normalizeUrl(r.ogUrl) !== normalizeUrl(r.url)) {
      record(r.url, 'og-url-mismatch', `${r.url}: og:url "${r.ogUrl}" does not match self`);
    }
    if (!r.description) {
      record(r.url, 'description-missing', `${r.url}: missing <meta name="description">`);
    } else if (
      r.descriptionLength < DESC_MIN_LEN ||
      r.descriptionLength > DESC_MAX_LEN
    ) {
      record(
        r.url,
        'description-length',
        `${r.url}: description length ${r.descriptionLength} chars (target ${DESC_MIN_LEN}-${DESC_MAX_LEN})`,
      );
    }
  }

  return { issues, allowlisted };
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  console.log(`SEO health check — ${date} UTC`);
  console.log(`Sitemap: ${SITEMAP_URL}\n`);

  const urls = await fetchSitemapUrls();
  console.log(`Discovered ${urls.length} URLs in sitemap.\n`);

  const results = await checkAllUrls(urls);
  const { issues, allowlisted } = findIssues(results);

  const log = {
    date,
    timestamp: new Date().toISOString(),
    sitemap: SITEMAP_URL,
    urlCount: urls.length,
    okCount: results.filter((r) => !r.error && r.status === 200).length,
    issueCount: issues.length,
    allowlistedCount: allowlisted.length,
    ok: issues.length === 0,
    issues,
    allowlisted,
    results,
  };

  mkdirSync(LOGS_DIR, { recursive: true });
  const logPath = join(LOGS_DIR, `${date}.json`);
  writeFileSync(logPath, JSON.stringify(log, null, 2));

  if (allowlisted.length > 0) {
    console.log(`ℹ️  ${allowlisted.length} known-baseline finding(s) (frozen content, see ALLOWLIST):`);
    for (const msg of allowlisted) console.log(`     - ${msg}`);
    console.log('');
  }

  if (issues.length === 0) {
    console.log(`✅ PASS: all ${urls.length} URLs healthy (excluding ${allowlisted.length} allowlisted).`);
    console.log(`Log: ${logPath}`);
    return;
  }

  console.log(`❌ FAIL: ${issues.length} issue(s) across ${urls.length} URLs.\n`);
  for (const issue of issues) console.log(`  - ${issue}`);
  console.log(`\nLog: ${logPath}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(2);
});
