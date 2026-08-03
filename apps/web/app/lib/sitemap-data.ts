import { getAllPosts } from '../blog/posts';
import lastmodMap from '../lastmod.generated.json';
import priority from '../blog/sitemap-priority.json';

/**
 * Shared source for the sitemap index and its three children.
 *
 * The site is split by how much Google should care:
 *   sitemap-core.xml    tools + hubs        priority 1.0, weekly
 *   sitemap-blog-1.xml  articles that earn  priority 0.8, weekly
 *   sitemap-blog-2.xml  the long tail       priority 0.3, monthly
 *
 * One flat file told Google every URL was equally worth crawling, which on a
 * young domain with a tight crawl budget means the tail competes with the
 * pages that actually rank.
 *
 * Only application routes and articles are listed. Assets (/_next/static,
 * og images, icons, .docx templates) are not routes and never were in here —
 * this file is a hand-kept list, not a filesystem walk.
 */

export const BASE_URL = 'https://www.signmypdf.io';

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
};

/**
 * Real per-route modification time, captured at push time by
 * scripts/generate-lastmod.mjs (git log -1 locally, where the history is
 * complete — Vercel's build clone is shallow and would only see HEAD).
 *
 * Falling back to build time would stamp every unknown route with the same
 * date, which is the signal-destroying behaviour we are avoiding, so a
 * missing route falls back to the repo's own last known date instead.
 */
const FALLBACK_LASTMOD = '2026-08-03';

function lastModFor(route: string): Date {
  const value = (lastmodMap as Record<string, string>)[route];
  return new Date(value || FALLBACK_LASTMOD);
}

/** Tools and hubs — the pages that must never wait behind an article. */
const CORE_ROUTES: { path: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/sign', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/fill', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/protect', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/merge', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/compress', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/split', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/sign-nda', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/blog', changeFrequency: 'weekly', priority: 1.0 },
];

/** Public pages that are neither a tool nor an article. Kept out of the core
 *  file so they can't dilute the priority-1.0 signal. */
const SECONDARY_ROUTES: { path: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }[] = [
  { path: '/sign-pdf-chrome-extension', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/extension/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/extension/support', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },
];

export function coreEntries(): SitemapEntry[] {
  return CORE_ROUTES.map((r) => ({
    url: r.path === '/' ? BASE_URL : `${BASE_URL}${r.path}`,
    lastModified: lastModFor(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}

const PRIORITY_SLUGS = new Set((priority as { slugs: string[] }).slugs);

/** Articles that earned traffic — worth re-crawling weekly. */
export function blogPriorityEntries(): SitemapEntry[] {
  return getAllPosts()
    .filter((post) => PRIORITY_SLUGS.has(post.slug))
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      // `modified` is set when an article is rewritten in place; reporting the
      // publication date would tell Google nothing had changed.
      lastModified: new Date(post.modified || post.date),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
}

/** Everything else — the long tail plus the secondary pages. */
export function blogTailEntries(): SitemapEntry[] {
  const posts = getAllPosts()
    .filter((post) => !PRIORITY_SLUGS.has(post.slug))
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.modified || post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    }));

  const secondary = SECONDARY_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: lastModFor(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  return [...secondary, ...posts];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function renderUrlset(entries: SitemapEntry[]): string {
  const body = entries
    .map(
      (e) =>
        `  <url>\n` +
        `    <loc>${e.url}</loc>\n` +
        `    <lastmod>${iso(e.lastModified)}</lastmod>\n` +
        `    <changefreq>${e.changeFrequency}</changefreq>\n` +
        `    <priority>${e.priority.toFixed(1)}</priority>\n` +
        `  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderIndex(children: { path: string; lastModified: Date }[]): string {
  const body = children
    .map(
      (c) =>
        `  <sitemap>\n    <loc>${BASE_URL}${c.path}</loc>\n    <lastmod>${iso(c.lastModified)}</lastmod>\n  </sitemap>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

/** Newest lastmod in a set — what a sitemap index should report for a child. */
export function newestLastmod(entries: SitemapEntry[]): Date {
  return entries.reduce(
    (max, e) => (e.lastModified > max ? e.lastModified : max),
    new Date(FALLBACK_LASTMOD),
  );
}

export const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
};
