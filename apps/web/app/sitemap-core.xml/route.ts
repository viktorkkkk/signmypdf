import { coreEntries, renderUrlset, XML_HEADERS } from '../lib/sitemap-data';

export const dynamic = 'force-static';

export function GET() {
  return new Response(renderUrlset(coreEntries()), { headers: XML_HEADERS });
}
