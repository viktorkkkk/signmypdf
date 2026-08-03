import { blogTailEntries, renderUrlset, XML_HEADERS } from '../lib/sitemap-data';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(blogTailEntries()), { headers: XML_HEADERS });
}
