import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, getAllTags } from './posts';
import Logo from '../components/Logo';

export const metadata: Metadata = {
  title: 'Blog | PDF Signing Tips, Guides & Best Practices',
  description: 'Learn how to sign PDFs online, electronic signature tips, and document security best practices. Expert guides for digital document workflows.',
  keywords: ['PDF signing blog', 'electronic signature tips', 'PDF guide', 'digital signature', 'document security'],
  openGraph: {
    title: 'SignMyPDF Blog - PDF Signing Tips & Guides',
    description: 'Expert guides on electronic signatures, PDF tools, and document security.',
    type: 'website',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const tags = getAllTags();

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

      {/* Hero */}
      <div className="container" style={{ paddingTop: 48, paddingBottom: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
          <h1 style={{ 
            fontSize: 38, 
            fontWeight: 800, 
            color: '#0f172a', 
            marginBottom: 12,
            letterSpacing: -0.5 
          }}>
            PDF Signing Tips & Guides
          </h1>
          <p style={{ 
            fontSize: 17, 
            color: '#64748b', 
            lineHeight: 1.6 
          }}>
            Learn how to sign PDFs online, master electronic signatures, and keep your documents secure.
          </p>
        </div>

        {/* Tags */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          gap: 8,
          marginBottom: 40 
        }}>
          {tags.map(tag => (
            <span 
              key={tag}
              style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                fontSize: 13,
                color: '#64748b',
                fontWeight: 500
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Posts Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 20 
        }}>
          {posts.map((post) => (
            <Link 
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <article style={{
                background: 'white',
                borderRadius: 20,
                padding: 24,
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.2s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}

              >
                {/* Meta */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  marginBottom: 16 
                }}>
                  <span style={{
                    padding: '4px 10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {post.readTime}
                  </span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    {new Date(post.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: 12,
                  lineHeight: 1.4
                }}>
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p style={{
                  fontSize: 14,
                  color: '#64748b',
                  lineHeight: 1.6,
                  marginBottom: 16,
                  flex: 1
                }}>
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{
                      padding: '4px 8px',
                      background: '#f8fafc',
                      color: '#64748b',
                      borderRadius: 6,
                      fontSize: 12
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Read more */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  Read article
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
        padding: '64px 24px',
        marginTop: 48
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 800,
            color: 'white',
            marginBottom: 12
          }}>
            Ready to sign your PDF?
          </h2>
          <p style={{
            fontSize: 16,
            color: '#bfdbfe',
            marginBottom: 28
          }}>
            Join thousands who trust SignMyPDF for fast, secure document signing.
          </p>
          <Link 
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '16px 32px',
              background: 'white',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 14,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
            }}
          >
            Sign PDF for Free
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>

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
