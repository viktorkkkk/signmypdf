import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, getAllTags } from './posts';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';

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
      <NavHeader />

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
              className="blog-card-link"
            >
              <article className="blog-card">
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
                <h2 className="blog-card-title">
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
                <div className="blog-card-arrow">
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

      <SiteFooter />
    </>
  );
}
