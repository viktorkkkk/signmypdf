# SignMyPDF Blog - SEO Content Management

## Adding New Articles

To add a new blog article, edit `/app/blog/posts.ts`:

```typescript
{
  slug: 'your-article-url-slug',
  title: 'Full Article Title for SEO',
  excerpt: 'Short description (150-160 chars) for meta and previews',
  metaTitle: 'Optional: Custom title tag (50-60 chars)',
  metaDescription: 'Optional: Custom meta description (150-160 chars)',
  date: '2025-04-09',
  author: 'SignMyPDF Team',
  readTime: '5 min read',
  tags: ['tag1', 'tag2', 'tag3'],
  content: `
# Main Heading

Your article content in markdown format...

## Subheadings

- List items
- More items

**Bold text** for emphasis.

[Link to tool](/)
  `
}
```

## SEO Checklist for New Articles

- [ ] **Slug**: Short, keyword-rich, hyphen-separated
- [ ] **Title**: 50-60 characters, includes main keyword
- [ ] **Excerpt**: 150-160 characters, compelling + keywords
- [ ] **Tags**: 3-5 relevant keywords
- [ ] **Content**: 500+ words, structured with H2/H3 headings
- [ ] **Internal links**: Link to main tool and other articles
- [ ] **Call to action**: End with link to sign PDF tool

## Target Keywords

### Primary Keywords
- sign pdf online
- sign pdf free
- pdf signature online
- electronic signature
- esign pdf

### Long-tail Keywords
- how to sign pdf online
- sign pdf without registration
- free pdf signature tool
- sign pdf on iphone
- is electronic signature legal
- secure pdf signing

## Article Template

```typescript
{
  slug: 'how-to-[action]-pdf-[context]',
  title: 'How to [Action] PDF [Context]: Complete Guide 2025',
  excerpt: 'Learn [benefit]. Step-by-step guide to [action] with [tool/features].',
  date: '2025-MM-DD',
  author: 'SignMyPDF Team',
  readTime: 'X min read',
  tags: ['pdf', 'tutorial', 'keywords'],
  content: `
# H1: Main keyword in title

Intro paragraph with primary keyword naturally included.

## H2: What/Why/How

Content with internal links to [/](/) main tool.

### H3: Step-by-step

1. First step
2. Second step
3. Third step

## H2: Benefits/Advantages

- Benefit 1
- Benefit 2
- Benefit 3

## H2: FAQ

**Q: Common question?**
A: Answer with keywords.

---

Ready to try? [Sign PDF now →](/)
  `
}
```

## Publishing Workflow

1. Write article following template
2. Add to `posts.ts` array
3. Test locally: `npm run dev`
4. Visit `/blog/[slug]` to verify
5. Deploy: `vercel --prod`
6. Submit to Google Search Console

## Sitemap Auto-Generation

Blog posts automatically appear in sitemap.xml. No manual action needed.

## Cross-Linking Strategy

- Link FROM every article TO main page (/)
- Link BETWEEN related articles
- Use descriptive anchor text with keywords
- Add "Related Articles" section appears automatically
