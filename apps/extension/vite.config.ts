import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

// `@crxjs/vite-plugin` walks the manifest, finds every entry point
// (popup HTML, service worker, content scripts, icons), bundles them
// with Vite/Rollup, and rewrites the manifest in `dist/` to point at
// the hashed output paths. We don't list inputs manually — that's
// what the plugin is for.
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Chrome MV3 service workers need ES modules; the plugin
    // configures Rollup appropriately, but we keep the chunking
    // simple so the manifest's `service_worker` path stays stable.
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // Vite serves `public/` files at the root of the dev/build output;
  // we put `icons/*.png` there so the manifest can reference them as
  // `icons/icon-N.png` without bundler involvement.
  publicDir: 'public',
});
