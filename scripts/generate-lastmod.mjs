#!/usr/bin/env node
/**
 * Capture per-page lastmod from `git log -1 --format=%cI -- <files>` and
 * write it to `app/lastmod.generated.json`. Run locally before push (or
 * via a pre-build hook in dev) so the production sitemap shows
 * meaningful per-URL freshness.
 *
 * On Vercel the build clone is shallow (--depth=1), so `git log` returns
 * empty for any file that wasn't touched in HEAD — that's why we capture
 * the data at the local push site rather than at deploy time.
 *
 * Usage: node scripts/generate-lastmod.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Each entry: route → list of source files whose last commit dictates
// the route's lastmod. Add new tool pages here.
const ROUTES = {
  '/':         ['app/page.tsx', 'app/layout.tsx'],
  '/sign':     ['app/sign/page.tsx', 'app/sign/layout.tsx'],
  '/fill':     ['app/fill/page.tsx', 'app/fill/layout.tsx'],
  '/protect':  ['app/protect/page.tsx', 'app/protect/layout.tsx'],
  '/merge':    ['app/merge/page.tsx', 'app/merge/layout.tsx'],
  '/compress': ['app/compress/page.tsx', 'app/compress/layout.tsx'],
  '/split':    ['app/split/page.tsx', 'app/split/layout.tsx'],
  '/blog':     ['app/blog/page.tsx', 'app/blog/posts.ts'],
  '/privacy':  ['app/privacy/page.tsx'],
  '/terms':    ['app/terms/page.tsx'],
};

function gitMtime(files) {
  const existing = files.filter((f) => existsSync(resolve(repoRoot, f)));
  if (existing.length === 0) return null;
  try {
    const out = execSync(
      `git log -1 --format=%cI -- ${existing.map((f) => `"${f}"`).join(' ')}`,
      { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out || null;
  } catch {
    return null;
  }
}

const map = {};
for (const [route, files] of Object.entries(ROUTES)) {
  const mtime = gitMtime(files);
  if (mtime) map[route] = mtime;
}

const out = resolve(repoRoot, 'app/lastmod.generated.json');
writeFileSync(out, JSON.stringify(map, null, 2) + '\n', 'utf-8');

console.log(`Wrote ${Object.keys(map).length} entries to app/lastmod.generated.json`);
for (const [route, mtime] of Object.entries(map)) {
  console.log(`  ${route.padEnd(12)} ${mtime}`);
}
