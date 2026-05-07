#!/usr/bin/env node
/**
 * Copy `pdf.worker.min.mjs` from the installed `pdfjs-dist` package into
 * `apps/web/public/` so the version that ships with the site always matches
 * the API version bundled into the app.
 *
 * Why a postinstall step (and not a checked-in static asset): pdfjs-dist
 * compares the API version with the worker's `workerVersion` postMessage on
 * `getDocument()` and refuses to render PDFs when they differ. A checked-in
 * worker drifts out of sync the moment npm/pnpm re-resolves the package
 * (caret semver). A copy-on-install pulls whatever version pnpm picked.
 *
 * Runs from `apps/web/` (the package root). Resolves the package via
 * `require.resolve('pdfjs-dist/package.json')` so the script is independent
 * of pnpm's symlinked store layout.
 */

import { copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const pkgPath = require.resolve('pdfjs-dist/package.json');
const src = join(dirname(pkgPath), 'build', 'pdf.worker.min.mjs');
const dst = resolve(here, '..', 'public', 'pdf.worker.min.mjs');

copyFileSync(src, dst);
console.log(`pdf-worker: copied ${src} → ${dst}`);
