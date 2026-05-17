import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages — they ship as raw TypeScript via the
  // pnpm workspace `:*` link. Without this, Next refuses to compile
  // imports from `@signmypdf/*` because the package's `main`/`types`
  // both point at `./src/index.ts`.
  transpilePackages: ['@signmypdf/pdf-core', '@signmypdf/ui', '@signmypdf/auth'],

  // /chrome was the original Chrome-extension landing slug; it now
  // lives at the keyword-rich /sign-pdf-chrome-extension. permanent
  // emits a 308 — equivalent to a 301 for Googlebot's canonical
  // consolidation. Older inbound links + email-newsletter targets
  // keep working without splitting ranking signals across two URLs.
  async redirects() {
    return [
      {
        source: '/chrome',
        destination: '/sign-pdf-chrome-extension',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
