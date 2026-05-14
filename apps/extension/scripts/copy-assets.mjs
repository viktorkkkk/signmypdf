/**
 * Postinstall asset copy — runs after `pnpm install` so the
 * extension's public/ dir always carries the latest pdfjs worker
 * and Dancing Script woff2 the editor expects at runtime.
 *
 * Both files are pulled from node_modules, so we never reach out
 * to a CDN at runtime — the extension is fully self-contained.
 *
 * Resolves package locations via `require.resolve` so we don't have
 * to hard-code pnpm's `.pnpm/`-store paths (which change on every
 * version bump).
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const publicDir = resolve(__dirname, '../public');

function safeResolvePkg(name) {
  try {
    return dirname(require.resolve(`${name}/package.json`));
  } catch {
    return null;
  }
}

function copy(label, src, dest) {
  if (!src || !existsSync(src)) {
    console.warn(`[ext-postinstall] ${label}: source missing at ${src ?? '(unresolved)'} — skipping.`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[ext-postinstall] ${label}: ${src} → ${dest}`);
}

const pdfjsDir = safeResolvePkg('pdfjs-dist');
copy(
  'pdf-worker',
  pdfjsDir && join(pdfjsDir, 'build', 'pdf.worker.min.mjs'),
  resolve(publicDir, 'pdf.worker.min.mjs'),
);

const dancingDir = safeResolvePkg('@fontsource/dancing-script');
copy(
  'dancing-script',
  dancingDir && join(dancingDir, 'files', 'dancing-script-latin-400-normal.woff2'),
  resolve(publicDir, 'fonts', 'dancing-script.woff2'),
);
