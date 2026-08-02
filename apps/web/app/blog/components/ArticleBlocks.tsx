import Link from 'next/link';
import type { ReactNode } from 'react';

/* ──────────────────────────────────────────────────────────────
   Reusable building blocks for long-form blog guides.

   Every block here is driven by a content marker parsed in
   app/blog/[slug]/BlogPostContent.tsx, so an article opts into
   any of them from posts.ts without touching this file:

     [QUICKANSWER] … [/QUICKANSWER]      → <QuickAnswer>
     [TOC]                               → <Toc>            (auto from ## {#id})
     [LABEL] Method 1 · Built into iOS   → <SectionLabel>
     [STEP 1] Open the PDF               → <StepHead>
     [SHOT file | alt | caption]         → <PhoneShot>
     [SHOTS] … [/SHOTS]                  → <ShotGrid two>
     [CALLOUT:warning] … [/CALLOUT]      → <Callout>
     [COMPARE] | a | b |                 → <CompareTable>
     [WIDGET]                            → inline upload dropzone
     [FIXGRID] … [/FIXGRID]              → <FixGrid>
     [FAQ] … [/FAQ]                      → <FaqAccordion>
     [RELATED] … [/RELATED]              → <RelatedGrid>

   Styling lives in app/blog/blog-article.css (`.ba-*`).
   ────────────────────────────────────────────────────────────── */

/** Direct-answer plate directly under the H1 — the featured-snippet target. */
export function QuickAnswer({ children }: { children: ReactNode }) {
  return (
    <div className="ba-quick">
      <span className="ba-kicker">Quick answer</span>
      {children}
    </div>
  );
}

export type TocItem = { id: string; label: string };

/**
 * Table of contents. `variant="inline"` renders the collapsible copy that
 * lives in the main column; `variant="rail"` renders the flat desktop-only
 * duplicate in the sidebar.
 */
export function Toc({ items, variant = 'inline' }: { items: TocItem[]; variant?: 'inline' | 'rail' }) {
  if (items.length === 0) return null;

  if (variant === 'rail') {
    return (
      <nav className="ba-rail-toc" aria-label="On this page">
        <p className="ba-label">On this page</p>
        <ol>
          {items.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`}>{it.label}</a>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  return (
    <details className="ba-toc" open>
      <summary>On this page</summary>
      <ol>
        {items.map((it, i) => (
          <li key={it.id}>
            <a href={`#${it.id}`}>{`${i + 1}. ${it.label}`}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Small uppercase kicker above a section heading ("Method 2 · In the browser"). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="ba-label">{children}</p>;
}

/** Numbered step heading — circle + H3, no card. */
export function StepHead({ n, title }: { n: number; title: ReactNode }) {
  return (
    <div className="ba-step">
      <span className="ba-step-num" aria-hidden="true">{n}</span>
      <h3>{title}</h3>
    </div>
  );
}

/** Screenshot inside a phone frame, with caption. */
export function PhoneShot({
  src,
  alt,
  caption,
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  priority?: boolean;
}) {
  return (
    <figure className="ba-shot">
      <span className="ba-frame">
        {/* Plain <img>: the assets are pre-sized WebP served from /public,
            so the optimizer would only add a round trip. Explicit
            width/height + aspect-ratio in CSS keep CLS at zero. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          {...(priority
            ? { loading: 'eager' as const, fetchPriority: 'high' as const }
            : { loading: 'lazy' as const })}
        />
      </span>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** One- or two-up grid of PhoneShots. */
export function ShotGrid({ two = false, children }: { two?: boolean; children: ReactNode }) {
  return <div className={two ? 'ba-shots ba-shots-two' : 'ba-shots'}>{children}</div>;
}

/** Tinted callout. Only `warning` is styled today; add variants in the CSS. */
export function Callout({
  variant = 'warning',
  title,
  children,
}: {
  variant?: 'warning';
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`ba-callout ba-callout-${variant}`}>
      {title && <h2 className="ba-callout-title">{title}</h2>}
      {children}
    </div>
  );
}

export type CompareCell = { text: ReactNode; tone?: 'yes' | 'no' };

/**
 * Comparison table. First column is a row header; the wrapper scrolls
 * horizontally on narrow screens instead of squeezing the columns.
 */
export function CompareTable({
  headers,
  rows,
}: {
  headers: ReactNode[];
  rows: { head: ReactNode; cells: CompareCell[] }[];
}) {
  return (
    <div className="ba-tablewrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{r.head}</th>
              {r.cells.map((c, j) => (
                <td key={j} className={c.tone === 'yes' ? 'ba-y' : c.tone === 'no' ? 'ba-n' : undefined}>
                  {c.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type FaqItem = { q: string; a: ReactNode };

/**
 * FAQ accordion built on <details>/<summary> — keyboard accessible and
 * open-able without JavaScript. The same items feed the FAQPage JSON-LD
 * so the schema always matches what is on screen.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="ba-faq">
      {items.map((it, i) => (
        <details key={i}>
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export type FixItem = { title: ReactNode; body: ReactNode };

/**
 * Troubleshooting grid: one card per problem, two columns from 720px.
 *
 * Headings stay `<h3>` on purpose — each "The Markup icon isn't there" is
 * its own long-tail query, and demoting them to <strong> would throw away
 * the heading hierarchy Google ranks on. The card is styling only.
 */
export function FixGrid({ items }: { items: FixItem[] }) {
  return (
    <div className="ba-fix-grid">
      {items.map((it, i) => (
        <div key={i} className="ba-fix-card">
          <h3>{it.title}</h3>
          <p>{it.body}</p>
        </div>
      ))}
    </div>
  );
}

export type RelatedItem = { title: string; href: string; desc?: string };

/** Related-guides cards. Lives in the main column so mobile readers see it. */
export function RelatedGrid({ items }: { items: RelatedItem[] }) {
  return (
    <div className="ba-rel-grid">
      {items.map((it) => (
        <Link key={it.href} href={it.href}>
          <span className="ba-rel-t">{it.title}</span>
          {it.desc && <span className="ba-rel-d">{it.desc}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Dark closing CTA card. */
export function CtaCard({
  title,
  sub,
  href,
  button,
}: {
  title: ReactNode;
  sub?: ReactNode;
  href: string;
  button: string;
}) {
  return (
    <div className="ba-card ba-cta">
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
      <Link href={href} className="ba-btn">{button}</Link>
    </div>
  );
}
