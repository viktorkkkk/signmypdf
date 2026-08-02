import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, getPublishedPosts } from '../../blog/posts';
import { extractFaq } from '../guide-parse';
import BlogPostContent from './BlogPostContent';

const SITE = 'https://www.signmypdf.io';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getPublishedPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Article Not Found' };
  }

  const canonicalPath = `/blog/${slug}`;
  const title = post.metaTitle || post.title;

  return {
    // Guides own their full title tag: the root `%s | SignMyPDF` template
    // would push these past the SERP truncation point.
    title: post.layout === 'guide' ? { absolute: title } : title,
    description: post.metaDescription || post.excerpt,
    keywords: post.tags,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonicalPath,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified || post.date,
      authors: [post.author],
      tags: post.tags,
      ...(post.ogImage ? { images: [{ url: post.ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      ...(post.ogImage ? { images: [post.ogImage] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getPublishedPosts();
  const url = `${SITE}/blog/${slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post!.title,
    description: post!.excerpt,
    ...(post!.ogImage ? { image: `${SITE}${post!.ogImage}` } : {}),
    author: { '@type': 'Person', name: post!.author },
    datePublished: post!.date,
    dateModified: post!.modified || post!.date,
    publisher: {
      '@type': 'Organization',
      name: 'SignMyPDF',
      url: SITE,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  // FAQPage must mirror what the reader sees, or Google drops it. Articles
  // that ship a [FAQ] block get their own questions; the rest keep the
  // site-wide defaults they have always emitted.
  const contentFaq = extractFaq(post!.content);
  const faqEntities = contentFaq.length > 0
    ? contentFaq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      }))
    : [
        { '@type': 'Question', name: 'Is it free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! You can sign up to 2 PDF documents per day completely free. No credit card required, no hidden fees.' } },
        { '@type': 'Question', name: 'Is it legal to sign PDF online?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. Electronic signatures are legally binding in the US (ESIGN Act, UETA), EU (eIDAS), UK, Canada, Australia, and 100+ countries worldwide.' } },
        { '@type': 'Question', name: 'Do I need to install anything?', acceptedAnswer: { '@type': 'Answer', text: 'No installation required. Our PDF signer works entirely in your web browser — Chrome, Safari, Firefox, Edge.' } },
        { '@type': 'Question', name: 'Is my document secure?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All PDF processing happens locally in your browser. Your files are never uploaded to our servers.' } },
      ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntities,
  };

  const howToSchema = post!.howTo
    ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: post!.howTo.name,
        ...(post!.howTo.totalTime ? { totalTime: post!.howTo.totalTime } : {}),
        estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
        ...(post!.howTo.supply
          ? { supply: post!.howTo.supply.map((name) => ({ '@type': 'HowToSupply', name })) }
          : {}),
        ...(post!.howTo.tool
          ? { tool: post!.howTo.tool.map((name) => ({ '@type': 'HowToTool', name })) }
          : {}),
        step: post!.howTo.steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
          ...(s.anchor ? { url: `${url}#${s.anchor}` } : {}),
        })),
      }
    : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
      { '@type': 'ListItem', position: 3, name: post!.breadcrumb || post!.title },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <BlogPostContent post={post!} allPosts={allPosts} />
    </>
  );
}
