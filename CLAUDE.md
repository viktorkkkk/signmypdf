# SignMyPDF — Monorepo

pnpm workspaces. Two-app architecture (web + extension, both live), three shared `packages/`.

## Project structure

```
apps/
  web/              ← Next.js 16 site, production at signmypdf.io
  extension/        ← Chrome MV3 extension, built, awaiting Chrome Web Store submission
packages/
  pdf-core/         ← signPdfInBrowser, addWatermarkToBlob, setupPdfjs, types (live)
  ui/               ← SignatureCanvas, PdfSignViewer, signature.css + 2-col /sign layout (live)
  auth/             ← placeholder, no exports yet
docs/               ← long-form references (stage summaries, audits)
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

- **`apps/web`** → Vercel project `signmypdf` (`prj_vINyT8bno6KjwutaPoX05rZaXQNI`), root directory set to `apps/web` in Vercel dashboard. Production at `signmypdf.io` / `www.signmypdf.io`. Auto-deploy on push-to-main via [.github/workflows/deploy-on-blog-push.yml](.github/workflows/deploy-on-blog-push.yml) (only when `apps/web/app/blog/posts.ts` changes) + manual `vercel deploy --prod` from repo root.
- **`apps/extension`** → built locally via `pnpm --filter @signmypdf/extension package`, distributed through the Chrome Web Store. Pre-built test bundle hosted as a GitHub Release asset: [`ext-test-1`](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1). See [docs/STAGE_5_SUMMARY.md](docs/STAGE_5_SUMMARY.md) for the full close-out.
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

## Stage 5 — Chrome Extension (COMPLETED 2026-05-12)

- **Status:** shipped to production (web side), awaiting Chrome Web Store submission (Trader verification in review on Google's side).
- **Extension name:** `Sign PDF Free` (publisher *SignMyPDF*).
- **Type:** thin extension — no popup, no built-in editor. The toolbar action and context menu both open `signmypdf.io/sign?from=extension` in a new tab; signing happens on the site.
- **Behavior:**
  - Click toolbar icon → `chrome.action.onClicked` fires in the service worker → `chrome.tabs.create({ url: SIGN_URL })`. The site renders minimal mode (slim sticky top bar + `No signup` chip, no NavHeader/footer/banner, 720×480 dropzone).
  - Right-click any PDF link → context menu **Sign with SignMyPDF** → service worker fetches the PDF, base64-encodes it, stashes in `chrome.storage.local`, opens the same `/sign` URL. The page's content-script bridge reads the file and primes the editor via postMessage.
- **Permissions:** `storage`, `contextMenus`, `activeTab` + `host_permissions` scoped to `signmypdf.io` only. No `<all_urls>`, no `tabs`, no `downloads`.
- **Structure:** [apps/extension/](apps/extension/) — Vite + `@crxjs/vite-plugin`. Manifest in [src/manifest.ts](apps/extension/src/manifest.ts) (typed, single source of truth). Source for service worker, content bridge, lib helpers and types under [src/](apps/extension/src/). Placeholder icons in `public/icons/icon-{16,32,48,128}.png`.
- **Build:** `pnpm --filter @signmypdf/extension build` → `apps/extension/dist/`.
- **Package:** `pnpm --filter @signmypdf/extension package` → `apps/extension/signmypdf-extension.zip` (~75 KB).
- **Production icons:** still placeholders (blue circle with "S"). Final icons need to be produced before publication.
- **Pre-built test bundle:** [`ext-test-1` GitHub Release](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1) — refreshed on every main change after a Stage 5 PR; non-technical reviewers download the ZIP and `Load unpacked` it.

PRs that landed Stage 5:

| PR | Squash SHA | What it shipped |
|---|---|---|
| [#17](https://github.com/viktorkkkk/signmypdf/pull/17) | `bc9df26` | Extension skeleton — manifest, service worker, context-menu, content-script bridge, GA4 Measurement Protocol client, placeholder icons, README + STORE_LISTING. |
| [#18](https://github.com/viktorkkkk/signmypdf/pull/18) | `e03d300` | `useExtensionFile()` hook in `apps/web/app/sign/page.tsx` — origin-locked postMessage handshake with the content-script bridge; primes the editor with the handed-off `File`. |
| [#19](https://github.com/viktorkkkk/signmypdf/pull/19) | `fd9b2fe` | Web-side surfaces — `/chrome` landing, `/extension/privacy` policy, `<ExtensionBanner />` install nudge, sitemap entries, footer links. |
| [#20](https://github.com/viktorkkkk/signmypdf/pull/20) | `093f368` | Final UX redesign — popup removed, `chrome.action.onClicked` opens `/sign?from=extension` directly; minimal mode on that URL (slim topbar + No-signup chip, no marketing chrome); `/chrome` single-purpose redesign (hero dropzone + `Install Free Chrome Extension` card + 3-step + 4-why + pitch line); unified 720×480 dropzone across all 8 surfaces; em-dashes purged from CTAs / headings / page titles. |

Site changes that came in for the extension:

- `/chrome` — landing page (hero with working dropzone + install CTA + screenshot placeholders + how-it-works + why list)
- `/extension/privacy` — Chrome Web Store-required privacy policy, separate from the main `/privacy`
- `/sign?from=extension` — minimal mode (no NavHeader/footer/banner/More-Tools/FAQ, slim sticky top bar with logo + `No signup` chip)
- `<ExtensionBanner variant="card" />` — 150 px card pitched under the dropzone on `/sign` upload step, before the More Tools grid
- All dropzones unified to **720 × 480** on `/sign`, `/sign?from=extension`, `/chrome`, `/fill`, `/protect`, `/merge`, `/split`, `/compress`

Pricing (unchanged from the rest of the site):

- Free — 2 PDFs / day across all tools, no signup, no watermark
- Monthly — $9 / month, unlimited
- Annual — $7.50 / month (billed $90 / year, ~17 % off)
- Cross-product: one subscription covers website + extension

Business context (for future sessions that need it):

- Company — **PIXELTIDE LLC**, 833 Saint Vincent, Irvine CA 92618, USA
- Domain — `signmypdf.io` (apex 307-redirects to `www.signmypdf.io`)
- Support email — `support@signmypdf.io`
- Chrome Web Store developer account — `viktor.kolektionok@gmail.com`
- Trader verification — awaiting Google review

Before Chrome Web Store submission:

- [ ] Production icons 16 / 32 / 48 / 128 (replace placeholders in `apps/extension/public/icons/`)
- [ ] 5 screenshots 1280×800 for the Web Store listing
- [ ] Promo tile 440×280
- [ ] Real screenshots inside `<ChromeLandingClient />` (replace placeholders in the *How the extension works* section)
- [ ] Final smoke-test of the production ZIP
- [ ] Submit for review (2–5 day moderation window)

Full close-out write-up: [docs/STAGE_5_SUMMARY.md](docs/STAGE_5_SUMMARY.md).

## Working with the user — Viktor

Stable communication preferences captured here so future Claude Code sessions can match the style without rediscovery:

- **Not an engineer.** Explain technical decisions in plain language, no jargon. Trade-offs are welcome, but lead with a recommendation, not a menu.
- **One task at a time.** Wait for confirmation before moving to the next concrete piece. Don't chain unrequested follow-up work into the same turn.
- **Single direct recommendations.** Avoid presenting two equal options unless the user explicitly asks to choose between approaches.
- **No scope creep into non-revenue work.** Polishing for its own sake is out of scope unless it directly supports a shipped feature or unblocks something the user named.
- **Deploys on assigned tasks are silent** (per stored memory) — commit, push, and run prod deploys without asking when the user gave a concrete task.

## Open issues / context

These bubble up to the monorepo level because they affect cross-cutting decisions or are at the top of the priority queue. Full detail in [apps/web/CLAUDE.md](apps/web/CLAUDE.md).

- **✅ Stage 5 — Chrome extension shipped 2026-05-12.** PRs #17, #18, #19, #20 all in main. Production deploy live on `www.signmypdf.io`. Pre-built test ZIP at the [`ext-test-1` GitHub Release](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1). Awaiting Chrome Web Store submission (production icons + screenshots + Trader verification on Google's side). See the *Stage 5* section above and [docs/STAGE_5_SUMMARY.md](docs/STAGE_5_SUMMARY.md).
- **✅ `/sign` 2-col layout + save-signature UX shipped 2026-05-08.** [PR #12](https://github.com/viktorkkkk/signmypdf/pull/12) (`feat(sign): 2-col grid layout on /sign for ≥1024px`, squashed as `34f0589`) lifted the page-level grid into `packages/ui/src/styles/signature.css` (`.sign-layout-grid` + `.sign-side-col` mobile→`display: contents` + grid-areas on desktop) so the planned Chrome popup inherits it from day one. [PR #13](https://github.com/viktorkkkk/signmypdf/pull/13) (`53b0c4d`) added the 3-signature free limit, the "Save for future use" / "Pro: unlimited saves" caption under the Save button, and a 3 s undo toast on delete. Production deploy `dpl_6MRAYntaQeiA48Gc4a4kosWtd2RU` aliased to `www.signmypdf.io`.
- **`/sign-nda` Phase 1 done, Phase 2/3 pending.** Saved-signature persistence currently scoped to `/sign-nda` only; planned to lift into shared `/sign` flow once the extension ships. Detail: `apps/web/CLAUDE.md → ## Pending decisions → Phase 2/3`.
- **Hub→tool handoff bug ✅ FIXED.** Was: `/` → tab → file pick → `/sign|fill|protect` showed dropzone-twice. Resolved by `008695f`'s `t.oncomplete` resolve in `txStore`; the May 7 "still broken" reports were stale browser-cache. Don't undo `008695f`. Full archaeology: `apps/web/CLAUDE.md → ## ✅ FIXED (was KNOWN BROKEN May 6-7 2026)`.
- **Bing/GSC indexing status.** GSC snapshot 2026-05-07: 8 indexed (canonical-consolidated), 4 "page with redirect" (intended), 0 "discovered — not indexed" (positive). 212 impressions / 0 clicks / avg position 61.5 over 28d. Bing: 0 backlinks, 1 impression at position 2.0, primary bottleneck is backlinks not indexation. Full detail: `apps/web/CLAUDE.md → ## SEO Indexing Status` + `### Bing baseline (2026-05-05)`.
