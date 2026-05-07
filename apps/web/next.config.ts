import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages — they ship as raw TypeScript via the
  // pnpm workspace `:*` link. Without this, Next refuses to compile
  // imports from `@signmypdf/*` because the package's `main`/`types`
  // both point at `./src/index.ts`.
  transpilePackages: ['@signmypdf/pdf-core', '@signmypdf/ui', '@signmypdf/auth'],
};

export default nextConfig;
