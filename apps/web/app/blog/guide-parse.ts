/* Pure helpers shared by the guide renderer (client) and the route's
   JSON-LD builder (server). No JSX, no React — importable from both. */

export type TocEntry = { id: string; label: string };
export type FaqEntry = { q: string; a: string };

/** `Heading text {#anchor}` / `Heading text {#anchor|Short label}` */
const ANCHOR_RE = /\s*\{#([\w-]+)(?:\|([^}]+))?\}\s*$/;

/** Split a trailing `{#id}` / `{#id|Label}` off a line. */
export function stripAnchor(line: string): { text: string; id?: string; tocLabel?: string } {
  const m = line.match(ANCHOR_RE);
  if (!m) return { text: line };
  return {
    text: line.slice(0, m.index).trim(),
    id: m[1],
    tocLabel: m[2]?.trim(),
  };
}

/** Drop inline markdown so a heading can be reused as a plain-text label. */
function plain(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/**
 * Build the table of contents from every line carrying a `{#anchor}`.
 * Works for `## ` headings and for anchored block markers alike, so the
 * TOC and the anchors can never drift apart.
 */
export function extractToc(content: string): TocEntry[] {
  const out: TocEntry[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!ANCHOR_RE.test(line)) continue;
    const { text, id, tocLabel } = stripAnchor(line);
    if (!id) continue;
    const label = tocLabel ?? plain(text.replace(/^#{1,4}\s+/, '').replace(/^\[[A-Z]+:?\w*\]\s*/, ''));
    if (label) out.push({ id, label });
  }
  return out;
}

/**
 * Pull the Q/A pairs out of a `[FAQ] … [/FAQ]` region as plain text.
 * The FAQPage JSON-LD is generated from this, which is what keeps the
 * schema word-for-word identical to the rendered accordion.
 */
export function extractFaq(content: string): FaqEntry[] {
  const region = content.match(/\[FAQ\]([\s\S]*?)\[\/FAQ\]/);
  if (!region) return [];
  const out: FaqEntry[] = [];
  for (const chunk of region[1].split(/\n\s*\n/)) {
    const lines = chunk.trim().split('\n');
    if (lines.length < 2) continue;
    const qMatch = lines[0].trim().match(/^\*\*(.+)\*\*$/);
    if (!qMatch) continue;
    out.push({ q: plain(qMatch[1]), a: plain(lines.slice(1).join(' ')) });
  }
  return out;
}
