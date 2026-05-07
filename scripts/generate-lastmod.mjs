#!/usr/bin/env node
/**
 * Capture per-page lastmod from `git log -1 --format=%cI -- <files>` and
 * write it to `apps/web/app/lastmod.generated.json`. Run locally before
 * push (or via a pre-build hook in dev) so the production sitemap shows
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

// Each entry: route → list of source files (relative to repo root) whose
// last commit dictates the route's lastmod. Add new tool pages here.
const ROUTES = {
  '/':         ['apps/web/app/page.tsx', 'apps/web/app/layout.tsx'],
  '/sign':     ['apps/web/app/sign/page.tsx', 'apps/web/app/sign/layout.tsx'],
  '/fill':     ['apps/web/app/fill/page.tsx', 'apps/web/app/fill/layout.tsx'],
  '/protect':  ['apps/web/app/protect/page.tsx', 'apps/web/app/protect/layout.tsx'],
  '/merge':    ['apps/web/app/merge/page.tsx', 'apps/web/app/merge/layout.tsx'],
  '/compress': ['apps/web/app/compress/page.tsx', 'apps/web/app/compress/layout.tsx'],
  '/split':    ['apps/web/app/split/page.tsx', 'apps/web/app/split/layout.tsx'],
  '/sign-nda': ['apps/web/app/sign-nda/page.tsx', 'apps/web/app/sign-nda/NdaHeroCard.tsx'],
  '/blog':     ['apps/web/app/blog/page.tsx', 'apps/web/app/blog/posts.ts'],
  '/privacy':  ['apps/web/app/privacy/page.tsx'],
  '/terms':    ['apps/web/app/terms/page.tsx'],
};

// Files that are staged for the about-to-be-made commit. When the script
// runs from a pre-commit hook, these are the files the next commit will
// contain — `git log -1 -- <file>` only sees the previous commit, so for
// staged files we use `now` instead. That way the JSON we generate
// matches the commit it ships with, not the one before it.
let stagedSet = null;
function getStagedFiles() {
  if (stagedSet !== null) return stagedSet;
  try {
    const out = execSync('git diff --cached --name-only', {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    stagedSet = new Set(out.trim().split('\n').filter(Boolean));
  } catch {
    stagedSet = new Set();
  }
  return stagedSet;
}

function gitMtime(files) {
  const existing = files.filter((f) => existsSync(resolve(repoRoot, f)));
  if (existing.length === 0) return null;

  // If any of the route's source files are staged for commit, the about-to-
  // -be-made commit IS the new lastmod. Use current time.
  const staged = getStagedFiles();
  if (existing.some((f) => staged.has(f))) {
    return new Date().toISOString();
  }

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

const out = resolve(repoRoot, 'apps/web/app/lastmod.generated.json');
writeFileSync(out, JSON.stringify(map, null, 2) + '\n', 'utf-8');

console.log(`Wrote ${Object.keys(map).length} entries to apps/web/app/lastmod.generated.json`);
for (const [route, mtime] of Object.entries(map)) {
  console.log(`  ${route.padEnd(12)} ${mtime}`);
}
