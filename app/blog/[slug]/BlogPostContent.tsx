'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BlogPost } from '../posts';
import Logo from '../../components/Logo';
import BlogPdfUploader from '../../components/BlogPdfUploader';

// Sticky CTA Component
function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling past 400px (past hero section)
      setIsVisible(window.scrollY > 400);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div 
      className="sticky-cta-mobile"
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '12px 16px', 
        background: 'white', 
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        zIndex: 100,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <Link 
        href="/" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8, 
          padding: '14px 24px', 
          background: '#2563eb', 
          color: 'white', 
          fontWeight: 700, 
          fontSize: 15, 
          borderRadius: 12, 
          textDecoration: 'none',
          width: '100%',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Sign PDF Now — Free
      </Link>
    </div>
  );
}

// FAQ Accordion Component — answer always in DOM for SEO, CSS controls visibility
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          padding: '20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
          {question}
        </span>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {/* Always rendered in DOM so Googlebot can index the answer text */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isOpen ? '400px' : '0',
        transition: 'max-height 0.3s ease',
        paddingBottom: isOpen ? 20 : 0,
        fontSize: 15, color: '#475569', lineHeight: 1.7,
      }}>
        {answer}
      </div>
    </div>
  );
}

// Parse content
function formatContent(content: string) {
  return content
    .split('\n\n')
    .map((block, i) => {
      const trimmed = block.trim();
      
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={i} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginTop: 48, marginBottom: 20, letterSpacing: -0.5 }}>
            {trimmed.slice(2)}
          </h1>
        );
      }
      
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={i} style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 40, marginBottom: 16 }}>
            {trimmed.slice(3)}
          </h2>
        );
      }
      
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={i} style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 12 }}>
            {trimmed.slice(4)}
          </h3>
        );
      }
      
      if (trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
        return (
          <ul key={i} style={{ listStyle: 'disc', paddingLeft: 24, marginBottom: 20, color: '#475569', lineHeight: 1.8 }}>
            {items.map((item, j) => <li key={j}>{item.trim().slice(2)}</li>)}
          </ul>
        );
      }
      
      if (/^\d+\./.test(trimmed)) {
        const items = trimmed.split('\n').filter(line => /^\d+\./.test(line.trim()));
        return (
          <ol key={i} style={{ listStyle: 'decimal', paddingLeft: 24, marginBottom: 20, color: '#475569', lineHeight: 1.8 }}>
            {items.map((item, j) => <li key={j}>{item.trim().replace(/^\d+\.\s*/, '')}</li>)}
          </ol>
        );
      }
      
      let text = trimmed;
      const boldParts: (string | React.ReactNode)[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      let keyCounter = 0;
      
      // Helper to parse links within text
      const parseLinks = (content: string): React.ReactNode[] => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts: React.ReactNode[] = [];
        let linkLastIndex = 0;
        let linkMatch;
        let linkKey = 0;
        
        while ((linkMatch = linkRegex.exec(content)) !== null) {
          if (linkMatch.index > linkLastIndex) {
            parts.push(content.slice(linkLastIndex, linkMatch.index));
          }
          parts.push(
            <Link key={linkKey++} href={linkMatch[2]} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>
              {linkMatch[1]}
            </Link>
          );
          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }
        if (linkLastIndex < content.length) {
          parts.push(content.slice(linkLastIndex));
        }
        return parts.length > 0 ? parts : [content];
      };
      
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) boldParts.push(text.slice(lastIndex, match.index));
        const innerContent = match[1];
        // Check if inner content has links
        if (innerContent.includes('](')) {
          boldParts.push(<strong key={keyCounter++} style={{ color: '#0f172a' }}>{parseLinks(innerContent)}</strong>);
        } else {
          boldParts.push(<strong key={keyCounter++} style={{ color: '#0f172a' }}>{innerContent}</strong>);
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) boldParts.push(text.slice(lastIndex));
      
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={i} style={{ borderLeft: '4px solid #2563eb', padding: '16px 20px', marginBottom: 20, background: '#f8fafc', borderRadius: '0 12px 12px 0' }}>
            <p style={{ color: '#475569', fontStyle: 'italic', margin: 0 }}>
              {boldParts.length > 0 ? boldParts : trimmed.slice(2)}
            </p>
          </blockquote>
        );
      }
      
      if (trimmed === '---') {
        return <hr key={i} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />;
      }
      
      if (trimmed) {
        // Parse any remaining markdown links in the text
        const parseLinksInText = (content: string | React.ReactNode[]): React.ReactNode => {
          if (Array.isArray(content)) {
            return content.map((part, idx) => 
              typeof part === 'string' ? parseLinksInText(part) : part
            );
          }
          if (typeof content !== 'string') return content;
          
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          const parts: React.ReactNode[] = [];
          let linkLastIndex = 0;
          let linkMatch;
          let linkKey = 0;
          
          while ((linkMatch = linkRegex.exec(content)) !== null) {
            if (linkMatch.index > linkLastIndex) {
              parts.push(content.slice(linkLastIndex, linkMatch.index));
            }
            parts.push(
              <Link key={linkKey++} href={linkMatch[2]} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                {linkMatch[1]}
              </Link>
            );
            linkLastIndex = linkMatch.index + linkMatch[0].length;
          }
          if (linkLastIndex < content.length) {
            parts.push(content.slice(linkLastIndex));
          }
          return parts.length > 0 ? parts : content;
        };
        
        return (
          <p key={i} style={{ marginBottom: 16, color: '#475569', lineHeight: 1.8, fontSize: 16 }}>
            {boldParts.length > 0 ? parseLinksInText(boldParts) : parseLinksInText(trimmed)}
          </p>
        );
      }
      
      return null;
    });
}

// SEO Variations Block
function SEOVariations() {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        More Ways to Sign PDFs
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            <Link href="/blog/sign-pdf-on-iphone-free" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign PDF on iPhone
            </Link>
          </h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            Sign PDF documents directly on your iPhone without installing apps. Works in Safari and Chrome.{' '}
            <Link href="/blog/sign-pdf-on-iphone-free" style={{ color: '#2563eb' }}>Learn more →</Link>
          </p>
        </div>
        
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            <Link href="/blog/sign-pdf-without-adobe" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign PDF Without Adobe
            </Link>
          </h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            Skip the expensive Adobe Acrobat subscription. Our free online tool provides the same capabilities.{' '}
            <Link href="/blog/sign-pdf-without-adobe" style={{ color: '#2563eb' }}>Learn more →</Link>
          </p>
        </div>
        
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            <Link href="/blog/sign-pdf-free-without-registration" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign PDF Without Registration
            </Link>
          </h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            No email required. No account creation. Just upload your PDF and sign instantly.{' '}
            <Link href="/blog/sign-pdf-free-without-registration" style={{ color: '#2563eb' }}>Learn more →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    { question: 'Is it free?', answer: 'Yes! You can sign up to 2 PDF documents per day completely free. No credit card required, no hidden fees. Need more? Premium plans start at $9/month for unlimited signing.' },
    { question: 'Is it legal to sign PDF online?', answer: 'Absolutely. Electronic signatures are legally binding in the US (ESIGN Act, UETA), EU (eIDAS), UK, Canada, Australia, and 100+ countries worldwide. Our signed documents meet all legal requirements.' },
    { question: 'Do I need to install anything?', answer: 'No installation required. Our PDF signer works entirely in your web browser — Chrome, Safari, Firefox, Edge. Simply open the website, upload your PDF, and start signing instantly.' },
    { question: 'Is my document secure?', answer: 'Yes, your documents are 100% secure. All PDF processing happens locally in your browser. Your files are never uploaded to our servers, and we collect zero personal data.' },
  ];

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        FAQ
      </h2>
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '0 24px' }}>
        {faqs.map((faq, index) => <FAQItem key={index} question={faq.question} answer={faq.answer} />)}
      </div>
    </div>
  );
}

// Final CTA Block
function FinalCTA() {
  return (
    <div style={{ marginTop: 48, padding: 40, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 24, textAlign: 'center', boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: -0.5 }}>
        Ready to sign your PDF?
      </h2>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 28 }}>
        Join thousands of users who trust SignMyPDF for fast, free document signing.
      </p>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 36px', background: 'white', color: '#2563eb', fontWeight: 800, fontSize: 16, borderRadius: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Sign PDF Now – Free
      </Link>
    </div>
  );
}

// Related Articles
function RelatedArticles({ currentSlug, allPosts }: { currentSlug: string; allPosts: BlogPost[] }) {
  const relatedPosts = allPosts.filter(p => p.slug !== currentSlug).slice(0, 6);

  return (
    <div style={{ marginTop: 48 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        Related Articles
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {relatedPosts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{post.readTime}</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 8, lineHeight: 1.4 }}>
                {post.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface BlogPostContentProps {
  post: BlogPost;
  allPosts: BlogPost[];
}

export default function BlogPostContent({ post, allPosts }: BlogPostContentProps) {
  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo"><Logo /></Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/blog" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '6px 12px', background: '#eff6ff', borderRadius: 8 }}>
              Blog
            </Link>
            <Link href="/privacy" style={{ color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span style={{ padding: '6px 14px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              {post.readTime}
            </span>
            <time dateTime={post.date} style={{ fontSize: 14, color: '#64748b' }}>
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
            <span style={{ fontSize: 14, color: '#64748b' }}>by {post.author}</span>
          </div>

          {/* H1 Title - SEO Optimized */}
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 24, lineHeight: 1.2, letterSpacing: -0.5 }}>
            {post.title} (Free & No Registration)
          </h1>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ padding: '6px 12px', background: '#f8fafc', color: '#64748b', borderRadius: 20, fontSize: 13 }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* HERO: PDF Uploader */}
          <div style={{ marginBottom: 48, padding: 40, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 24, boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)' }}>
            <BlogPdfUploader />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 20, textAlign: 'center' }}>
              Sign your PDF in seconds — no registration, no downloads
            </p>
          </div>

          {/* Subtitle under Hero */}
          <p style={{ fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
            Upload your PDF, add your signature, and download instantly. Works on any device.
          </p>

          {/* CTA after subtitle */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Link 
              href="/" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '14px 28px', 
                background: '#2563eb', 
                color: 'white', 
                fontWeight: 700, 
                fontSize: 15, 
                borderRadius: 12, 
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Start Signing Now
            </Link>
          </div>

          {/* Content */}
          <div style={{ fontSize: 16 }}>
            {formatContent(post.content)}
          </div>

          {/* SEO Variations */}
          <SEOVariations />

          {/* FAQ Accordion */}
          <FAQSection />

          {/* Final CTA */}
          <FinalCTA />

          {/* Related Articles */}
          <RelatedArticles currentSlug={post.slug} allPosts={allPosts} />
        </div>
      </article>

      {/* Sticky Mobile CTA */}
      <StickyCTA />

      {/* Footer */}
      <footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '32px 0 80px', marginTop: 48 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div>
              <Link href="/" className="logo" style={{ display: 'inline-block', marginBottom: 8 }}><Logo /></Link>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Simple and secure PDF signing tool. No registration required.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Contact</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14, color: '#64748b', lineHeight: 2 }}>
                <li>📧 support@signmypdf.io</li>
                <li>🌐 https://signmypdf.io</li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Resources</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                <li><Link href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>Blog</Link></li>
                <li><Link href="/blog/how-to-sign-pdf-online-free" style={{ color: '#64748b', textDecoration: 'none' }}>How to Sign PDF</Link></li>
                <li><Link href="/blog/electronic-signature-legality" style={{ color: '#64748b', textDecoration: 'none' }}>E-Signature Legal Guide</Link></li>
                <li><Link href="/blog/sign-pdf-iphone-ipad" style={{ color: '#64748b', textDecoration: 'none' }}>Sign on iPhone/iPad</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                <li><Link href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</Link></li>
                <li><Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Company</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                PIXELTIDE LLC<br />
                833 Saint Vincent<br />
                Irvine, CA 92618, USA
              </p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            © {new Date().getFullYear()} PIXELTIDE LLC. All rights reserved. · <Link href="/terms" style={{ color: '#94a3b8' }}>Terms</Link> · <Link href="/privacy" style={{ color: '#94a3b8' }}>Privacy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
