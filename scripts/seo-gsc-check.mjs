#!/usr/bin/env node
/**
 * Daily Google Search Console health check for signmypdf.io.
 *
 * Catches the class of problem we missed on Apr 25: code shipped looking
 * fine in HTML, but Google's view of the site was stale by 7+ days because
 * the sitemap hadn't been re-fetched, and Indexed count stayed at 0 for
 * weeks without anyone noticing. This script asserts:
 *
 *   - At least one verified property is reachable with current creds.
 *   - The www sitemap has been DOWNLOADED by Google in the last 7 days.
 *   - There are URLs in the sitemap (sanity check for sitemap.ts breakage).
 *   - At least 1 of N URLs is indexed once the site is more than 14 days
 *     past its last sitemap re-fetch (gives Google time, but not forever).
 *   - Property still has siteOwner permission (catches accidental
 *     permission downgrades).
 *
 * Reads service account credentials from env var `GSC_CREDENTIALS`
 * (the full contents of signmypdf-seo-97022bc5390f.json as a string).
 * In the GitHub Action this comes from a repo secret of the same name.
 *
 * Writes a JSON report to logs/seo-gsc/YYYY-MM-DD.json. Exits 0 on
 * pass, 1 on regression, 2 on script-level crash. The workflow turns
 * non-zero into a GitHub Issue with label `seo-health` (same label as
 * the metadata health check — both are "indexing safety net").
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createSign } from 'crypto';

const PROPERTY = 'sc-domain:signmypdf.io'; // Domain property added Apr 27
const WWW_SITEMAP = 'https://www.signmypdf.io/sitemap.xml';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const LOGS_DIR = 'logs/seo-gsc';

// "Sitemap not refetched in N days" threshold. Google usually re-fetches
// every 1-7 days. If it's been longer, something's wrong.
const SITEMAP_STALE_DAYS = 7;

// "Should have at least 1 indexed URL by now" threshold, measured from the
// FIRST sitemap submission (not last fetch). Google usually indexes new
// sites within 14 days; if past that and still 0, dig into reasons.
const INDEXED_GRACE_DAYS = 14;

// First sitemap submission to the new Domain property. Update if you
// re-create the property. ISO 8601 date.
const PROPERTY_CREATED_AT = '2026-04-27';

function b64u(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJWT(c) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const p = b64u(
    JSON.stringify({
      iss: c.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const data = `${h}.${p}`;
  const s = createSign('RSA-SHA256');
  s.update(data);
  const sig = s
    .sign(c.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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

async function listSites(t) {
  const r = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${t}` },
  });
  return r.json();
}

async function listSitemaps(t, siteUrl) {
  const r = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
    { headers: { Authorization: `Bearer ${t}` } },
  );
  return r.json();
}

async function searchAnalytics(t, siteUrl, body) {
  const r = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  return r.json();
}

function daysSince(isoString) {
  return (Date.now() - new Date(isoString).getTime()) / 86400000;
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  console.log(`GSC health check — ${date} UTC`);
  console.log(`Property: ${PROPERTY}`);
  console.log(`Sitemap: ${WWW_SITEMAP}\n`);

  const credsRaw = process.env.GSC_CREDENTIALS;
  if (!credsRaw) {
    throw new Error(
      'GSC_CREDENTIALS env var not set. In GitHub Actions, set it from the repo secret of the same name. Locally, export it from signmypdf-seo-97022bc5390f.json contents.',
    );
  }
  // Accept both raw JSON and base64-encoded JSON. The existing GitHub
  // repo secret uses base64; running locally with `cat foo.json` gives
  // raw JSON. Try direct parse first, fall back to base64 decode.
  let credentials;
  const trimmed = credsRaw.trim();
  if (trimmed.startsWith('{')) {
    credentials = JSON.parse(trimmed);
  } else {
    try {
      credentials = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
    } catch {
      throw new Error(
        'GSC_CREDENTIALS is neither raw JSON (must start with `{`) nor valid base64-encoded JSON.',
      );
    }
  }

  const token = await getToken(credentials);

  const issues = [];
  const facts = {};

  // Check 1 — verified property visible & owner permission
  const sites = await listSites(token);
  if (!sites.siteEntry) {
    issues.push(`GSC: no properties visible — auth/permission lost`);
  } else {
    const target = sites.siteEntry.find((s) => s.siteUrl === PROPERTY);
    if (!target) {
      issues.push(`GSC: ${PROPERTY} not in service-account property list`);
    } else if (target.permissionLevel !== 'siteOwner') {
      issues.push(
        `GSC: permission downgraded for ${PROPERTY} (now: ${target.permissionLevel}, expected: siteOwner)`,
      );
    }
    facts.propertyPermission = target?.permissionLevel || 'missing';
    facts.allProperties = sites.siteEntry.map((s) => ({
      siteUrl: s.siteUrl,
      permissionLevel: s.permissionLevel,
    }));
  }

  // Check 2 — sitemap freshness
  const sm = await listSitemaps(token, PROPERTY);
  const wwwSitemap = (sm.sitemap || []).find((s) => s.path === WWW_SITEMAP);
  if (!wwwSitemap) {
    issues.push(
      `GSC: ${WWW_SITEMAP} not registered in property — was it removed?`,
    );
  } else {
    facts.sitemapSubmitted = wwwSitemap.lastSubmitted;
    facts.sitemapDownloaded = wwwSitemap.lastDownloaded;
    facts.sitemapErrors = wwwSitemap.errors || 0;
    facts.sitemapWarnings = wwwSitemap.warnings || 0;
    facts.sitemapWebUrlCount =
      (wwwSitemap.contents || []).find((c) => c.type === 'web')?.submitted ||
      0;
    facts.sitemapWebIndexed =
      (wwwSitemap.contents || []).find((c) => c.type === 'web')?.indexed ?? null;

    if (wwwSitemap.errors && wwwSitemap.errors > 0) {
      issues.push(
        `GSC: sitemap ${WWW_SITEMAP} reports ${wwwSitemap.errors} error(s)`,
      );
    }
    if (!wwwSitemap.lastDownloaded) {
      issues.push(
        `GSC: sitemap ${WWW_SITEMAP} has NEVER been downloaded by Google (submitted ${wwwSitemap.lastSubmitted})`,
      );
    } else {
      const stale = daysSince(wwwSitemap.lastDownloaded);
      if (stale > SITEMAP_STALE_DAYS) {
        issues.push(
          `GSC: sitemap last downloaded ${stale.toFixed(1)} days ago (threshold: ${SITEMAP_STALE_DAYS}d). Google has stopped re-fetching — investigate.`,
        );
      }
    }
    if (facts.sitemapWebUrlCount === 0) {
      issues.push(
        `GSC: sitemap reports 0 web URLs — sitemap.ts is producing an empty list`,
      );
    }
  }

  // Check 3 — indexation lag (impressions as proxy for indexed pages,
  // since the legacy webmasters/v3 API doesn't expose per-URL Indexed
  // state. URL Inspection API would, but it requires the
  // searchconsole.googleapis.com endpoint which isn't enabled in our
  // Cloud project. Impressions > 0 means at least one URL is in the
  // index and ranked for at least one query.)
  const today = new Date().toISOString().slice(0, 10);
  const start28 = new Date(Date.now() - 28 * 86400000)
    .toISOString()
    .slice(0, 10);

  const totals = await searchAnalytics(token, PROPERTY, {
    startDate: start28,
    endDate: today,
    dimensions: [],
  });
  if (totals.error) {
    issues.push(`GSC: searchAnalytics error: ${totals.error.message}`);
  } else {
    const r = (totals.rows || [])[0];
    facts.impressions28d = r ? r.impressions : 0;
    facts.clicks28d = r ? r.clicks : 0;
    facts.avgPosition28d = r ? r.position : null;

    const propertyAge = daysSince(PROPERTY_CREATED_AT);
    if (propertyAge > INDEXED_GRACE_DAYS && (r?.impressions || 0) === 0) {
      issues.push(
        `GSC: 0 impressions in 28d and property is ${propertyAge.toFixed(0)} days old (threshold: ${INDEXED_GRACE_DAYS}d). Google sees no indexed pages — check "Page indexing → Reasons" in the GSC UI.`,
      );
    }
  }

  // By page (top 20) for visibility
  if (!totals.error) {
    const byPage = await searchAnalytics(token, PROPERTY, {
      startDate: start28,
      endDate: today,
      dimensions: ['page'],
      rowLimit: 20,
    });
    facts.topPages = (byPage.rows || []).map((r) => ({
      url: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
    }));
    facts.pagesWithImpressions28d = (byPage.rows || []).length;
  }

  const log = {
    date,
    timestamp: new Date().toISOString(),
    property: PROPERTY,
    sitemap: WWW_SITEMAP,
    issueCount: issues.length,
    ok: issues.length === 0,
    issues,
    facts,
  };

  mkdirSync(LOGS_DIR, { recursive: true });
  const logPath = join(LOGS_DIR, `${date}.json`);
  writeFileSync(logPath, JSON.stringify(log, null, 2));

  console.log('--- Facts ---');
  console.log(`Sitemap submitted:  ${facts.sitemapSubmitted || '?'}`);
  console.log(`Sitemap downloaded: ${facts.sitemapDownloaded || 'never'}`);
  console.log(`URLs in sitemap:    ${facts.sitemapWebUrlCount ?? '?'}`);
  console.log(`Indexed (sitemap):  ${facts.sitemapWebIndexed ?? 'n/a (legacy API)'}`);
  console.log(`Impressions 28d:    ${facts.impressions28d ?? '?'}`);
  console.log(`Clicks 28d:         ${facts.clicks28d ?? '?'}`);
  console.log(`Avg position 28d:   ${facts.avgPosition28d?.toFixed(1) ?? '?'}`);
  console.log(`Pages w/ imp. 28d:  ${facts.pagesWithImpressions28d ?? 0}`);
  console.log('');

  if (issues.length === 0) {
    console.log(`✅ PASS: GSC indexation healthy.`);
    console.log(`Log: ${logPath}`);
    return;
  }

  console.log(`❌ FAIL: ${issues.length} issue(s):\n`);
  for (const issue of issues) console.log(`  - ${issue}`);
  console.log(`\nLog: ${logPath}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(2);
});
