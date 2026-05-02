import { MetadataRoute } from 'next';
import { getAllPosts } from './blog/posts';
import lastmodMap from './lastmod.generated.json';

// Per-route lastmod is captured at push time by `scripts/generate-lastmod.mjs`
// (which runs `git log -1` locally, where the full history is available, and
// commits the result as `app/lastmod.generated.json`). On Vercel the build
// clone is shallow, so reading git there would only see HEAD — capturing it
// locally is what makes per-URL freshness meaningful.
//
// If a route is missing from the JSON (forgot to regenerate, brand-new route),
// fall back to current build time so the sitemap is always valid.
function lastModFor(route: string): Date {
  const value = (lastmodMap as Record<string, string>)[route];
  return value ? new Date(value) : new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Canonical = www. The apex domain (signmypdf.io) 307-redirects to www;
  // listing apex URLs in the sitemap forces Google to follow a redirect for
  // every URL, which delays indexing and dilutes ranking signals.
  const baseUrl = 'https://www.signmypdf.io';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: lastModFor('/'),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sign`,
      lastModified: lastModFor('/sign'),
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/fill`,
      lastModified: lastModFor('/fill'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/protect`,
      lastModified: lastModFor('/protect'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/merge`,
      lastModified: lastModFor('/merge'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/compress`,
      lastModified: lastModFor('/compress'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/split`,
      lastModified: lastModFor('/split'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sign-nda`,
      lastModified: lastModFor('/sign-nda'),
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: lastModFor('/blog'),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: lastModFor('/privacy'),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: lastModFor('/terms'),
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
