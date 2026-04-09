import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '../posts';

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
    return {
      title: 'Article Not Found',
    };
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

// Simple markdown-like parser
function formatContent(content: string) {
  return content
    .split('\n\n')
    .map((block, i) => {
      const trimmed = block.trim();
      
      // H1
      if (trimmed.startsWith('# ')) {
        return <h1 key={i} className="text-3xl md:text-4xl font-bold text-slate-900 mt-12 mb-6">{trimmed.slice(2)}</h1>;
      }
      
      // H2
      if (trimmed.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold text-slate-900 mt-10 mb-4">{trimmed.slice(3)}</h2>;
      }
      
      // H3
      if (trimmed.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-semibold text-slate-900 mt-8 mb-3">{trimmed.slice(4)}</h3>;
      }
      
      // Lists
      if (trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
        return (
          <ul key={i} className="list-disc list-inside space-y-2 mb-6 text-slate-700">
            {items.map((item, j) => (
              <li key={j} className="leading-relaxed">{item.trim().slice(2)}</li>
            ))}
          </ul>
        );
      }
      
      // Numbered lists
      if (/^\d+\./.test(trimmed)) {
        const items = trimmed.split('\n').filter(line => /^\d+\./.test(line.trim()));
        return (
          <ol key={i} className="list-decimal list-inside space-y-2 mb-6 text-slate-700">
            {items.map((item, j) => (
              <li key={j} className="leading-relaxed">{item.trim().replace(/^\d+\.\s*/, '')}</li>
            ))}
          </ol>
        );
      }
      
      // Bold text **text**
      let text = trimmed;
      const boldParts: (string | JSX.Element)[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      let keyCounter = 0;
      
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          boldParts.push(text.slice(lastIndex, match.index));
        }
        boldParts.push(<strong key={keyCounter++} className="font-semibold text-slate-900">{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        boldParts.push(text.slice(lastIndex));
      }
      
      // Blockquote
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={i} className="border-l-4 border-blue-500 pl-4 py-2 my-6 bg-blue-50 rounded-r-lg">
            <p className="text-slate-700 italic">{boldParts.length > 0 ? boldParts : trimmed.slice(2)}</p>
          </blockquote>
        );
      }
      
      // Horizontal rule
      if (trimmed === '---') {
        return <hr key={i} className="my-8 border-slate-200" />;
      }
      
      // Regular paragraph
      if (trimmed) {
        return (
          <p key={i} className="mb-4 text-slate-700 leading-relaxed">
            {boldParts.length > 0 ? boldParts : trimmed}
          </p>
        );
      }
      
      return null;
    });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    notFound();
  }

  const relatedPosts = getAllPosts()
    .filter(p => p.slug !== post.slug && p.tags.some(tag => post.tags.includes(tag)))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span className="font-bold text-lg">SignMyPDF</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
              Sign PDF
            </Link>
            <Link href="/blog" className="text-blue-600 font-medium">
              Blog
            </Link>
            <Link href="/privacy" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-slate-700 truncate">{post.title}</span>
          </nav>
        </div>
      </div>

      {/* Article */}
      <article className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-500">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
              {post.readTime}
            </span>
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </time>
            <span>by {post.author}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-10">
            {post.tags.map(tag => (
              <Link 
                key={tag}
                href={`/blog?tag=${tag}`}
                className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {formatContent(post.content)}
          </div>

          {/* CTA Box */}
          <div className="mt-12 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Ready to try it yourself?
            </h3>
            <p className="text-slate-600 mb-6">
              Sign your PDF documents online for free. No registration required — start signing in seconds.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Sign PDF for Free
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map(related => (
                <Link 
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all"
                >
                  <span className="text-sm text-slate-500">{related.readTime}</span>
                  <h3 className="text-lg font-semibold text-slate-900 mt-2 mb-3 line-clamp-2 hover:text-blue-600 transition-colors">
                    {related.title}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-2">{related.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 text-white mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <span className="font-bold">SignMyPDF</span>
              </Link>
              <p className="text-sm">Free, secure PDF signing. No registration required.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-white transition-colors">Sign PDF</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/blog/how-to-sign-pdf-online-free" className="hover:text-white transition-colors">How to Sign PDF</Link></li>
                <li><Link href="/blog/electronic-signature-legality" className="hover:text-white transition-colors">Is E-Signature Legal?</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-sm text-center">
            © {new Date().getFullYear()} SignMyPDF. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
