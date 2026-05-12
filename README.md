# SignMyPDF

Free online PDF tools — sign, fill, protect, merge, compress, split. 100% client-side, no registration, no paywall at download.

Production: <https://www.signmypdf.io>

## Repo layout

```
apps/
  web/              Next.js 16 site → signmypdf.io
  extension/        Chrome MV3 extension, built + tested,
                    awaiting Chrome Web Store submission
packages/
  pdf-core/         signPdfInBrowser, addWatermarkToBlob, setupPdfjs, types (live)
  ui/               SignatureCanvas, PdfSignViewer, signature.css (live)
  auth/             placeholder, no exports yet
docs/               long-form references (stage summaries, audits)
scripts/            infra-level scripts (kept at root)
.github/workflows/  CI workflows
logs/               deploy + SEO health logs
```

## Apps

### `apps/web` — main site

Next.js 16 App Router on Vercel, project ID `prj_vINyT8bno6KjwutaPoX05rZaXQNI`.
Tools (`/sign`, `/fill`, `/protect`, `/merge`, `/split`, `/compress`,
`/sign-nda`, `/chrome`), `/blog` with ~70 SEO articles, `/dashboard` for
Pro users, `/extension/privacy` for the Chrome Web Store reviewer.

### `apps/extension` — Chrome MV3 extension

Thin bridge. Click the toolbar icon or right-click a PDF link →
`signmypdf.io/sign?from=extension` opens in a new tab in minimal mode.
No popup, no built-in editor. Source under `apps/extension/src/`, built
with Vite + `@crxjs/vite-plugin`.

- Build: `pnpm --filter @signmypdf/extension build`
- Production ZIP: `pnpm --filter @signmypdf/extension package`
- Pre-built test bundle:
  <https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1>
- See [docs/STAGE_5_SUMMARY.md](docs/STAGE_5_SUMMARY.md) for the full
  closure write-up.

## Quick start

Requires pnpm 9+ and Node 20+.

```bash
pnpm install                                      # workspace deps + package links
pnpm dev                                          # apps/web (Next.js dev)
pnpm build                                        # apps/web production build
pnpm lint                                         # apps/web lint
pnpm --filter @signmypdf/extension build          # extension production build
pnpm --filter @signmypdf/extension dev            # extension watch build
pnpm --filter @signmypdf/extension typecheck      # extension TS check
pnpm --filter @signmypdf/extension package        # extension production ZIP
```

## Deploys

- **Web → Vercel.** Production at `signmypdf.io`. Auto-deploy on
  push-to-main only when `apps/web/app/blog/posts.ts` changes (see
  [.github/workflows/deploy-on-blog-push.yml](.github/workflows/deploy-on-blog-push.yml)).
  Other changes deploy via `vercel deploy --prod` from repo root.
- **Extension → Chrome Web Store** (planned). Local builds + GitHub
  Release `ext-test-1` for now.

## Documentation

- [CLAUDE.md](CLAUDE.md) — monorepo-level rules, conventions, Stage 5 close-out
- [apps/web/CLAUDE.md](apps/web/CLAUDE.md) — full operational context for the web app (deploy, blog publication, SEO infra, design system, known bugs)
- [apps/extension/README.md](apps/extension/README.md) — extension build, local-test matrix, Chrome Web Store pre-submission checklist
- [apps/extension/STORE_LISTING.md](apps/extension/STORE_LISTING.md) — copy + assets list for the Chrome Web Store
- [docs/STAGE_5_SUMMARY.md](docs/STAGE_5_SUMMARY.md) — Stage 5 closure summary
