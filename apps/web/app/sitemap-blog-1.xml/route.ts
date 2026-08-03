import { blogPriorityEntries, renderUrlset, XML_HEADERS } from '../lib/sitemap-data';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(blogPriorityEntries()), { headers: XML_HEADERS });
}
