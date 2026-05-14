import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

// `@crxjs/vite-plugin` walks the manifest, finds every entry point
// referenced by `action.default_popup`, `content_scripts`,
// `background.service_worker`, etc., bundles them with Vite/Rollup,
// and rewrites the manifest in `dist/` to point at the hashed output
// paths. It does NOT auto-bundle HTML referenced only in
// `web_accessible_resources`, which is where our editor page lives,
// so we add `editor.html` as an explicit Rollup input below.
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'src/editor/editor.html'),
      },
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // Vite serves `public/` files at the root of the dev/build output;
  // we put `icons/*.png`, `fonts/*.woff2`, and `pdf.worker.min.mjs`
  // there so the manifest and CSS can reference them by stable paths.
  publicDir: 'public',
});
