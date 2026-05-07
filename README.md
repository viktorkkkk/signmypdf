# SignMyPDF

Free online PDF tools — sign, fill, protect, merge, compress, split. 100% client-side, no registration, no paywall at download.

Production: <https://www.signmypdf.io>

## Repo layout

```
apps/
  web/              Next.js 16 site → signmypdf.io
  extension/        Chrome MV3 extension (planned)
packages/
  pdf-core/         shared PDF logic (placeholder)
  ui/               shared React components (placeholder)
  auth/             shared auth logic (placeholder)
scripts/            infra-level scripts (kept at root)
.github/workflows/  CI workflows
logs/               deploy + SEO health logs
```

## Quick start

Requires pnpm 9+ and Node 20+.

```bash
pnpm install
pnpm dev          # runs apps/web
pnpm build
pnpm lint
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — monorepo-level rules and conventions
- [apps/web/CLAUDE.md](apps/web/CLAUDE.md) — full operational context for the web app (deploy, blog publication, SEO infra, design system, known bugs)
