import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '../../blog/posts';
import BlogPostContent from './BlogPostContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
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

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getAllPosts();

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post!.title,
    description: post!.excerpt,
    author: { '@type': 'Person', name: post!.author },
    datePublished: post!.date,
    dateModified: post!.date,
    publisher: {
      '@type': 'Organization',
      name: 'SignMyPDF',
      url: 'https://signmypdf.io',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://signmypdf.io/blog/${slug}`,
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Is it free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! You can sign up to 2 PDF documents per day completely free. No credit card required, no hidden fees.' } },
      { '@type': 'Question', name: 'Is it legal to sign PDF online?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. Electronic signatures are legally binding in the US (ESIGN Act, UETA), EU (eIDAS), UK, Canada, Australia, and 100+ countries worldwide.' } },
      { '@type': 'Question', name: 'Do I need to install anything?', acceptedAnswer: { '@type': 'Answer', text: 'No installation required. Our PDF signer works entirely in your web browser — Chrome, Safari, Firefox, Edge.' } },
      { '@type': 'Question', name: 'Is my document secure?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All PDF processing happens locally in your browser. Your files are never uploaded to our servers.' } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogPostContent post={post!} allPosts={allPosts} />
    </>
  );
}
