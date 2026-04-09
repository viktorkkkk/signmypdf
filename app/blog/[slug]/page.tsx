import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '../../blog/posts';
import Logo from '../../components/Logo';

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
        return (
          <h1 key={i} style={{ 
            fontSize: 32, 
            fontWeight: 800, 
            color: '#0f172a', 
            marginTop: 48, 
            marginBottom: 20,
            letterSpacing: -0.5 
          }}>
            {trimmed.slice(2)}
          </h1>
        );
      }
      
      // H2
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={i} style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            color: '#0f172a', 
            marginTop: 40, 
            marginBottom: 16 
          }}>
            {trimmed.slice(3)}
          </h2>
        );
      }
      
      // H3
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={i} style={{ 
            fontSize: 20, 
            fontWeight: 600, 
            color: '#1e293b', 
            marginTop: 32, 
            marginBottom: 12 
          }}>
            {trimmed.slice(4)}
          </h3>
        );
      }
      
      // Lists
      if (trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
        return (
          <ul key={i} style={{ 
            listStyle: 'disc', 
            paddingLeft: 24, 
            marginBottom: 20,
            color: '#475569',
            lineHeight: 1.8
          }}>
            {items.map((item, j) => (
              <li key={j}>{item.trim().slice(2)}</li>
            ))}
          </ul>
        );
      }
      
      // Numbered lists
      if (/^\d+\./.test(trimmed)) {
        const items = trimmed.split('\n').filter(line => /^\d+\./.test(line.trim()));
        return (
          <ol key={i} style={{ 
            listStyle: 'decimal', 
            paddingLeft: 24, 
            marginBottom: 20,
            color: '#475569',
            lineHeight: 1.8
          }}>
            {items.map((item, j) => (
              <li key={j}>{item.trim().replace(/^\d+\.\s*/, '')}</li>
            ))}
          </ol>
        );
      }
      
      // Bold text **text**
      let text = trimmed;
      const boldParts: (string | React.ReactNode)[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      let keyCounter = 0;
      
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          boldParts.push(text.slice(lastIndex, match.index));
        }
        boldParts.push(<strong key={keyCounter++} style={{ color: '#0f172a' }}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        boldParts.push(text.slice(lastIndex));
      }
      
      // Blockquote
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={i} style={{
            borderLeft: '4px solid #2563eb',
            padding: '16px 20px',
            marginBottom: 20,
            background: '#f8fafc',
            borderRadius: '0 12px 12px 0'
          }}>
            <p style={{ color: '#475569', fontStyle: 'italic', margin: 0 }}>
              {boldParts.length > 0 ? boldParts : trimmed.slice(2)}
            </p>
          </blockquote>
        );
      }
      
      // Horizontal rule
      if (trimmed === '---') {
        return <hr key={i} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />;
      }
      
      // Regular paragraph
      if (trimmed) {
        return (
          <p key={i} style={{ 
            marginBottom: 16, 
            color: '#475569', 
            lineHeight: 1.8,
            fontSize: 16
          }}>
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
    <>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <Logo />
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link 
              href="/blog" 
              style={{ 
                color: '#2563eb', 
                textDecoration: 'none', 
                fontSize: 14, 
                fontWeight: 600,
                padding: '6px 12px',
                background: '#eff6ff',
                borderRadius: 8
              }}
            >
              Blog
            </Link>
            <Link 
              href="/privacy" 
              style={{ 
                color: '#475569', 
                textDecoration: 'none', 
                fontSize: 14, 
                fontWeight: 500 
              }}
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>Blog</Link>
            <span>/</span>
            <span style={{ color: '#334155' }}>{post.title}</span>
          </nav>
        </div>
      </div>

      {/* Article */}
      <article className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Meta */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: 16, 
            marginBottom: 20 
          }}>
            <span style={{
              padding: '6px 14px',
              background: '#eff6ff',
              color: '#2563eb',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600
            }}>
              {post.readTime}
            </span>
            <time dateTime={post.date} style={{ fontSize: 14, color: '#64748b' }}>
              {new Date(post.date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </time>
            <span style={{ fontSize: 14, color: '#64748b' }}>
              by {post.author}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 24,
            lineHeight: 1.2,
            letterSpacing: -0.5
          }}>
            {post.title}
          </h1>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
            {post.tags.map(tag => (
              <span key={tag} style={{
                padding: '6px 12px',
                background: '#f8fafc',
                color: '#64748b',
                borderRadius: 20,
                fontSize: 13
              }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* HERO CTA Banner - Upload PDF */}
          <div style={{
            marginBottom: 48,
            padding: 40,
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            borderRadius: 24,
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)'
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 32
            }}>
              📄
            </div>
            <h2 style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'white',
              marginBottom: 12,
              letterSpacing: -0.5
            }}>
              Upload your file and sign in seconds
            </h2>
            <p style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.9)',
              marginBottom: 28,
              lineHeight: 1.6,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              No registration required. Sign 2 PDFs per day completely free.
            </p>
            <Link 
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '18px 36px',
                background: 'white',
                color: '#2563eb',
                fontWeight: 800,
                fontSize: 16,
                borderRadius: 16,
                textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload PDF & Sign Free
            </Link>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 16
            }}>
              ✓ No credit card required • ✓ No watermark
            </p>
          </div>

          {/* Content */}
          <div style={{ fontSize: 16 }}>
            {formatContent(post.content)}
          </div>

          {/* CTA Box */}
          <div style={{
            marginTop: 48,
            padding: 32,
            background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
            borderRadius: 20,
            border: '1px solid #dbeafe'
          }}>
            <h3 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 12
            }}>
              Ready to try it yourself?
            </h3>
            <p style={{
              fontSize: 15,
              color: '#475569',
              marginBottom: 24,
              lineHeight: 1.6
            }}>
              Sign your PDF documents online for free. No registration required — start signing in seconds.
            </p>
            <Link 
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white',
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 14,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(37,99,235,0.3)'
              }}
            >
              Sign PDF for Free
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div style={{ background: '#f8fafc', padding: '48px 24px' }}>
          <div className="container" style={{ padding: 0 }}>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 24
            }}>
              Related Articles
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: 20 
            }}>
              {relatedPosts.map(related => (
                <Link 
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 20,
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{related.readTime}</span>
                    <h3 style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#0f172a',
                      marginTop: 8,
                      lineHeight: 1.4
                    }}>
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        background: '#0f172a',
        color: '#94a3b8',
        padding: '48px 24px 24px'
      }}>
        <div className="container" style={{ padding: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 32,
            marginBottom: 32
          }}>
            {/* Company */}
            <div>
              <Link href="/" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                textDecoration: 'none',
                marginBottom: 12 
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 16
                }}>
                  ✍️
                </div>
                <span style={{ 
                  fontWeight: 800, 
                  color: 'white',
                  fontSize: 16
                }}>
                  SignMyPDF
                </span>
              </Link>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                Free, secure PDF signing. No registration required.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 12 }}>
                Product
              </h4>
              <ul style={{ listStyle: 'none', fontSize: 13, lineHeight: 2 }}>
                <li><Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Sign PDF</Link></li>
                <li><Link href="/blog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Blog</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 12 }}>
                Resources
              </h4>
              <ul style={{ listStyle: 'none', fontSize: 13, lineHeight: 2 }}>
                <li><Link href="/blog/how-to-sign-pdf-online-free" style={{ color: '#94a3b8', textDecoration: 'none' }}>How to Sign PDF</Link></li>
                <li><Link href="/blog/electronic-signature-legality" style={{ color: '#94a3b8', textDecoration: 'none' }}>E-Signature Legal Guide</Link></li>
                <li><Link href="/blog/sign-pdf-iphone-ipad" style={{ color: '#94a3b8', textDecoration: 'none' }}>Sign on iPhone/iPad</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 12 }}>
                Legal
              </h4>
              <ul style={{ listStyle: 'none', fontSize: 13, lineHeight: 2 }}>
                <li><Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link></li>
                <li><Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #1e293b',
            paddingTop: 24,
            textAlign: 'center',
            fontSize: 12
          }}>
            © {new Date().getFullYear()} SignMyPDF. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
