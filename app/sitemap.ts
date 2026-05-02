import { MetadataRoute } from 'next';
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAllPosts } from './blog/posts';

// Resolve the latest commit time for the given files. If git history
// isn't available (e.g. shallow clone, local fs without .git), fall back
// to the file mtime, then to the current build time. The whole point is
// that an unchanged page should keep an old lastmod across deploys —
// Bing/Google discount sitemaps where every URL bumps on every build.
function pageLastMod(relativePaths: string[]): Date {
  const existing = relativePaths.filter((p) => existsSync(resolve(process.cwd(), p)));
  if (existing.length === 0) return new Date();

  try {
    const out = execSync(`git log -1 --format=%cI -- ${existing.map((p) => `"${p}"`).join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return new Date(out);
  } catch {
    // git not available — fall through to fs mtime
  }

  try {
    const newest = existing.reduce((acc, p) => {
      const m = statSync(resolve(process.cwd(), p)).mtime;
      return m > acc ? m : acc;
    }, new Date(0));
    if (newest.getTime() > 0) return newest;
  } catch {
    // fall through
  }

  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Canonical = www. The apex domain (signmypdf.io) 307-redirects to www;
  // listing apex URLs in the sitemap forces Google to follow a redirect for
  // every URL, which delays indexing and dilutes ranking signals.
  const baseUrl = 'https://www.signmypdf.io';

  const lastmod = (route: string) =>
    pageLastMod([`app${route}/page.tsx`, `app${route}/layout.tsx`]);

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: pageLastMod(['app/page.tsx', 'app/layout.tsx']),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sign`,
      lastModified: lastmod('/sign'),
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/fill`,
      lastModified: lastmod('/fill'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/protect`,
      lastModified: lastmod('/protect'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/merge`,
      lastModified: lastmod('/merge'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/compress`,
      lastModified: lastmod('/compress'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/split`,
      lastModified: lastmod('/split'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: pageLastMod(['app/blog/page.tsx', 'app/blog/posts.ts']),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: lastmod('/privacy'),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: lastmod('/terms'),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  // Blog posts
  const posts = getAllPosts();
  const blogPosts = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogPosts];
}
