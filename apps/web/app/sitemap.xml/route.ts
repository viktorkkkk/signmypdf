import {
  blogPriorityEntries,
  blogTailEntries,
  coreEntries,
  newestLastmod,
  renderIndex,
  XML_HEADERS,
} from '../lib/sitemap-data';

export const dynamic = 'force-static';

/**
 * Sitemap index. Children are ordered by how much crawl budget they deserve —
 * Google reads the index top-down and the order is a hint, not a rule, but it
 * costs nothing to put the tools first.
 */
export function GET() {
  const xml = renderIndex([
    { path: '/sitemap-core.xml', lastModified: newestLastmod(coreEntries()) },
    { path: '/sitemap-blog-1.xml', lastModified: newestLastmod(blogPriorityEntries()) },
    { path: '/sitemap-blog-2.xml', lastModified: newestLastmod(blogTailEntries()) },
  ]);
  return new Response(xml, { headers: XML_HEADERS });
}
