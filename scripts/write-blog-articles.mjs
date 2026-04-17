#!/usr/bin/env node
/**
 * Automated blog article writer for signmypdf.io
 * Reads .claude/blog-plan.json, finds next 2 unpublished articles,
 * generates them via Claude API, inserts into posts.ts,
 * updates the GSC indexing script.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/write-blog-articles.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Validate env ─────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

const MODEL = 'claude-opus-4-5';

// ── Load blog plan ────────────────────────────────────────────────
const planPath = join(ROOT, '.claude/blog-plan.json');
if (!existsSync(planPath)) {
  console.error('❌  .claude/blog-plan.json not found');
  process.exit(1);
}
const plan = JSON.parse(readFileSync(planPath, 'utf8'));

// ── Find existing slugs ───────────────────────────────────────────
const postsPath = join(ROOT, 'app/blog/posts.ts');
const postsContent = readFileSync(postsPath, 'utf8');
const existingSlugs = new Set(
  [...postsContent.matchAll(/slug: '([^']+)'/g)].map(m => m[1])
);

// ── Find next 2 to write ──────────────────────────────────────────
const pending = plan.articles.filter(a => !existingSlugs.has(a.slug));
const toWrite = pending.slice(0, 2);

if (toWrite.length === 0) {
  console.log('✅  All 60 articles already published! Nothing to do.');
  process.exit(0);
}

console.log(`\n📋  Published so far: ${existingSlugs.size} / ${plan.articles.length}`);
console.log(`📝  Writing next ${toWrite.length} article(s):\n`);
toWrite.forEach(a => console.log(`   • ${a.title}`));
console.log('');

// ── Slugs available for internal links ───────────────────────────
const allSlugs = plan.articles.map(a => a.slug);

// ── Claude API ────────────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// ── Build prompt ──────────────────────────────────────────────────
function buildPrompt(article, publishedSlugs) {
  const isFill = article.slug.includes('fill') || article.title.toLowerCase().includes('fill out') || article.title.toLowerCase().includes('fill in');
  const today = new Date().toISOString().split('T')[0];

  // Pick 12 existing slugs for suggested internal links
  const linkOptions = publishedSlugs
    .filter(s => s !== article.slug)
    .slice(0, 15)
    .map(s => `  /blog/${s}`)
    .join('\n');

  const mainLink = isFill
    ? '[SignMyPDF Fill Tool](/fill)'
    : '[SignMyPDF](/)';
  const toolDesc = isFill
    ? 'free online PDF form-filling tool at signmypdf.io/fill'
    : 'free online PDF signing tool at signmypdf.io';

  return `You are an SEO content writer for signmypdf.io — a free, 100% browser-based PDF tool. No registration required, no file uploads to servers, completely private.

Write a complete blog article for:
- Slug: ${article.slug}
- Title: ${article.title}
- Date: ${today}

The tool you are writing about is the ${toolDesc}.

═══════════════════════════════════════════════
EXACT ARTICLE STRUCTURE (follow in this order):
═══════════════════════════════════════════════

1. QuickSummary block (first line of content):
[QuickSummary]Time: 2 min|Cost: Free|Works on: All devices|No registration: Yes

2. Introduction (2-3 paragraphs):
   - Open with the main pain point or question from the title
   - Naturally include the primary keyword from the title
   - Mention ${mainLink} with a descriptive anchor
   - End with a clear promise of what this article covers

3. Step-by-step section:
## How to [Action] — Step by Step

### Step 1: Open ${isFill ? 'the SignMyPDF Fill Tool' : 'SignMyPDF'}
Visit ${isFill ? '[signmypdf.io/fill](/fill)' : '[signmypdf.io](/)'}...

### Step 2: [next step]
...

### Step 3: [next step]
...
(Continue for 4–6 steps total, each with 2-4 sentences of explanation)

4. Security callout:
[CALLOUT]🔒 Your documents never leave your browser. SignMyPDF processes everything locally — no uploads, no servers, no data stored.

5. Comparison table (include where relevant to the topic):
## [Topic] Tool Comparison

| Feature | SignMyPDF | [Main Competitor] | [Second Competitor] |
|---|---|---|---|
| Price | Free | [price] | [price] |
| Registration required | No | Yes | Yes |
| Works in browser | ✅ | ✅ | ✅ |
| No watermark (free) | ✅ 2/day | ❌ | ❌ |
[add 3-5 more relevant rows]

6. User reviews:
## What Our Users Say

> "[Specific, helpful review about solving a real-world problem — 2-3 sentences]" — **[FirstName] [LastInitial]., [City], [State abbrev]**

> "[Different user, different use case — 2-3 sentences]" — **[FirstName] [LastInitial]., [City], [State abbrev]**

> "[Third user — 2-3 sentences]" — **[FirstName] [LastInitial]., [City], [State abbrev]**

7. CTA block:
[CTA]Try It Free — No Registration|Works in your browser. No software, no account, no limits on file size.|Start Free Now

8. FAQ section:
## Frequently Asked Questions

**Is [main action from title] legally binding?**
[2-3 sentences on legality — reference ESIGN Act or relevant law]

**Is SignMyPDF completely free?**
[explain free plan: 2 PDFs/day without watermark, then watermark; Pro removes watermark]

**Does it work on iPhone and Android?**
[yes, mobile-optimized, no app needed]

**Do I need to create an account?**
[No — emphasize privacy angle]

**What happens to my document after I [action]?**
[explain client-side processing, nothing uploaded]

**[One more question specific to this article's topic]**
[answer]

9. Related Articles (exactly 3 links from the list below):
## Related Articles

- [Article Title](/blog/slug)
- [Article Title](/blog/slug)
- [Article Title](/blog/slug)

═══════════════════════════
AVAILABLE SLUGS FOR LINKING:
═══════════════════════════
${linkOptions}

(Choose the 3 most relevant to this article's topic for the Related Articles section.
Also weave 2-3 more internal links naturally into the article body.)

═══════════
RULES:
═══════════
- American English, conversational-professional tone
- Total article length: 1500–2000 words
- Minimum 5 internal links total (3 in Related Articles + 2+ in body)
- Do NOT use backtick characters (\`) anywhere — not even in code examples
- Do NOT wrap output in markdown code blocks
- All special markers must appear exactly: [QuickSummary], [CALLOUT], [CTA]

═══════════════════
RESPONSE FORMAT:
═══════════════════
Return ONLY a valid JSON object — no markdown fences, no explanation before or after. Just the JSON:

{
  "excerpt": "One engaging sentence for the blog listing page, under 160 chars, includes primary keyword",
  "content": "THE FULL ARTICLE CONTENT as described above — all markdown, all special markers, all links included",
  "tags": ["primary keyword", "tag2", "tag3", "tag4", "tag5"],
  "metaTitle": "SEO page title, under 60 characters, includes primary keyword and year",
  "metaDescription": "SEO meta description, 150-160 characters, primary keyword near start, includes call to action"
}`;
}

// ── Insert article into posts.ts ──────────────────────────────────
function insertArticle(article, parsed) {
  const today = new Date().toISOString().split('T')[0];

  // Safety: remove any stray backticks from generated content
  const safeContent = parsed.content.replace(/`/g, "'");

  // Escape single quotes in short fields
  const esc = str => String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const tsEntry = `  {
    slug: '${esc(article.slug)}',
    title: '${esc(article.title)}',
    excerpt: '${esc(parsed.excerpt)}',
    content: \`${safeContent}\`,
    date: '${today}',
    author: 'SignMyPDF Team',
    readTime: '8 min read',
    tags: ${JSON.stringify(parsed.tags)},
    metaTitle: '${esc(parsed.metaTitle)}',
    metaDescription: '${esc(parsed.metaDescription)}',
  },\n`;

  const current = readFileSync(postsPath, 'utf8');
  const insertAt = current.lastIndexOf('];');

  if (insertAt === -1) throw new Error('Cannot find closing ]; in posts.ts');

  const updated = current.slice(0, insertAt) + tsEntry + current.slice(insertAt);
  writeFileSync(postsPath, updated, 'utf8');
}

// ── Add URL to GSC indexing script ───────────────────────────────
function addToIndexScript(slug) {
  const scriptPath = join(ROOT, 'scripts/index-pages.mjs');
  const content = readFileSync(scriptPath, 'utf8');
  const urlLine = `  BASE_URL + '/blog/${slug}',`;

  if (content.includes(`/blog/${slug}`)) return; // already present

  const insertAt = content.lastIndexOf('];');
  const updated = content.slice(0, insertAt) + urlLine + '\n' + content.slice(insertAt);
  writeFileSync(scriptPath, updated, 'utf8');
}

// ── Main loop ─────────────────────────────────────────────────────
const publishedUrls = [];
let currentPublishedSlugs = [...existingSlugs];

for (const article of toWrite) {
  console.log(`\n⏳  Generating: "${article.title}"...`);

  const prompt = buildPrompt(article, currentPublishedSlugs);

  let parsed;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callClaude(prompt);

      // Extract JSON — Claude sometimes wraps it in ```json ... ```
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in Claude response');

      parsed = JSON.parse(jsonMatch[0]);

      // Basic validation
      if (!parsed.content || parsed.content.length < 500) {
        throw new Error(`Content too short (${parsed.content?.length ?? 0} chars)`);
      }
      break;
    } catch (err) {
      console.error(`   Attempt ${attempt} failed: ${err.message}`);
      if (attempt === 3) {
        console.error(`❌  Giving up on ${article.slug}`);
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  insertArticle(article, parsed);
  addToIndexScript(article.slug);

  currentPublishedSlugs.push(article.slug);
  publishedUrls.push(`https://signmypdf.io/blog/${article.slug}`);
  console.log(`✅  Done: /blog/${article.slug}`);

  // Delay between articles
  if (toWrite.indexOf(article) < toWrite.length - 1) {
    await new Promise(r => setTimeout(r, 2000));
  }
}

// ── Final report ──────────────────────────────────────────────────
const totalNow = existingSlugs.size + publishedUrls.length;
const totalPlanned = plan.articles.length;
const remaining = totalPlanned - totalNow;

console.log('\n' + '═'.repeat(52));
console.log('  📊  BLOG PUBLISHING REPORT');
console.log('═'.repeat(52));
publishedUrls.forEach(url => console.log(`  📄  ${url}`));
console.log(`\n  Progress: ${totalNow} / ${totalPlanned} published | ${remaining} remaining`);
console.log('═'.repeat(52) + '\n');

// Save summary for CI step and for reference
const summary = {
  publishedUrls,
  totalPublished: totalNow,
  totalPlanned,
  remaining,
  timestamp: new Date().toISOString(),
};
writeFileSync(join(ROOT, '.claude/last-run.json'), JSON.stringify(summary, null, 2));
