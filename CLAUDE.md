# SignMyPDF — Monorepo

pnpm workspaces. Two-app architecture (web in prod, extension planned), three shared `packages/`.

## Project structure

```
apps/
  web/              ← Next.js 16 site, production at signmypdf.io
  extension/        ← Chrome MV3 extension (planned, not started)
packages/
  pdf-core/         ← shared PDF logic (placeholder, empty)
  ui/               ← shared React components (placeholder, empty)
  auth/             ← shared auth logic (placeholder, empty)
scripts/            ← infra-level scripts (lastmod, indexnow, GSC, SEO health) — stay at root
.github/workflows/  ← CI workflows, run from repo root
logs/               ← deploy / SEO health logs, written by GH Actions
```

**Operational context for `apps/web`** lives in [apps/web/CLAUDE.md](apps/web/CLAUDE.md) (~1k lines: deploy commands, blog publication rules, SEO infrastructure, known broken bugs, design system tokens, etc.). Read it before touching anything inside `apps/web/`.

## Rules

- **NEVER duplicate logic between `apps/`.** If two apps need the same code, extract it to `packages/`. Three placeholder packages exist for exactly this purpose.
- **`apps/web` is in production.** Changes there require explicit confirmation and pass through the same release discipline as before the monorepo split.
- **All PDF processing happens client-side.** No server-side PDF parsing or storage — that's the privacy positioning the product is built on.
- **Per-app CLAUDE.md is canonical for that app.** This root CLAUDE.md only covers monorepo-level concerns. Don't duplicate per-app rules here.

## Conventions

- TypeScript strict mode everywhere (`apps/web/tsconfig.json` is already strict; new packages inherit)
- Tailwind for styling in `apps/web` (extension TBD)
- pnpm workspaces — do not mix npm/yarn lockfiles
- Lint and build scripts on the root `package.json` proxy through `pnpm --filter web ...`

## Deployment

- **`apps/web`** → Vercel project `signmypdf` (`prj_vINyT8bno6KjwutaPoX05rZaXQNI`), root directory set to `apps/web` in Vercel dashboard. Production at `signmypdf.io` / `www.signmypdf.io`. Auto-deploy on push-to-main via [.github/workflows/deploy-on-blog-push.yml](.github/workflows/deploy-on-blog-push.yml) (only when `apps/web/app/blog/posts.ts` changes) + manual `vercel deploy --prod` from `apps/web/`.
- **`apps/extension`** → not yet built. When ready, distribution path is Chrome Web Store, not Vercel.
- Production branch: `main`. Pre-commit hook ([.husky/pre-commit](.husky/pre-commit)) regenerates `apps/web/app/lastmod.generated.json` so per-page sitemap freshness ships in the same commit as the page change.

## Common commands

```bash
pnpm install        # install all workspace deps + link packages/* into apps/web
pnpm dev            # → pnpm --filter web dev (Next.js dev server)
pnpm build          # → pnpm --filter web build (production build of apps/web)
pnpm start          # → pnpm --filter web start
pnpm lint           # → pnpm --filter web lint
```

For `apps/web`-specific commands and ops (Vercel deploy CLI, blog publication trigger, SEO indexing scripts), see [apps/web/CLAUDE.md → ## How to Deploy](apps/web/CLAUDE.md).

## Open issues / context

These bubble up to the monorepo level because they affect cross-cutting decisions or are at the top of the priority queue. Full detail in [apps/web/CLAUDE.md](apps/web/CLAUDE.md).

- **🚨 Mobile-hero handoff bug.** `/` → tab → file pick → `/sign|fill|protect` shows dropzone-twice instead of loaded editor. 0% mobile conversion to `pdf_signed`. Three attempted fixes failed. Candidate next approach is dropping IndexedDB for `sessionStorage` + base64 transport. Full story: `apps/web/CLAUDE.md → ## ⚠️ KNOWN BROKEN (May 6-7 2026)`.
- **`/sign-nda` Phase 1 done, Phase 2/3 pending.** Saved-signature persistence currently scoped to `/sign-nda` only; planned to lift into shared `/sign` flow once stable. Detail: `apps/web/CLAUDE.md → ## Pending decisions → Phase 2/3`.
- **Bing/GSC indexing status.** GSC snapshot 2026-05-07: 8 indexed (canonical-consolidated), 4 "page with redirect" (intended), 0 "discovered — not indexed" (positive). 212 impressions / 0 clicks / avg position 61.5 over 28d. Bing: 0 backlinks, 1 impression at position 2.0, primary bottleneck is backlinks not indexation. Full detail: `apps/web/CLAUDE.md → ## SEO Indexing Status` + `### Bing baseline (2026-05-05)`.
