import Link from 'next/link';
import Logo from './Logo';

export default function SiteFooter() {
  return (
    <footer style={{ background: '#0f172a', paddingTop: 64, paddingBottom: 0, marginTop: 'auto' }}>
      <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>

        <div className="footer-grid" style={{ marginBottom: 52 }}>

          {/* Col 1 — Brand (2fr) */}
          <div>
            <Link href="/" className="footer-brand">
              <Logo />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>SignMyPDF</span>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>Sign &amp; Fill PDF — No Registration</span>
              </div>
            </Link>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.75, maxWidth: 220, margin: '16px 0 24px' }}>
              Fast, private PDF tools.<br />No software. No account required.
            </p>

            {/* Facebook */}
            <a
              href="https://web.facebook.com/profile.php?id=61572329731082"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="footer-social-icon"
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: '#1e293b', border: '1px solid #334155',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', textDecoration: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>

          {/* Col 2 — Tools */}
          <div>
            <h4 className="footer-heading">Tools</h4>
            <ul className="footer-links">
              <li><Link href="/sign" className="footer-link">Sign PDF</Link></li>
              <li><Link href="/fill" className="footer-link">Fill PDF Form</Link></li>
              <li><Link href="/protect" className="footer-link">Protect PDF</Link></li>
              <li><Link href="/merge" className="footer-link">Merge PDF</Link></li>
              <li><Link href="/compress" className="footer-link">Compress PDF</Link></li>
              <li><Link href="/split" className="footer-link">Split PDF</Link></li>
            </ul>
          </div>

          {/* Col 3 — Blog */}
          <div>
            <h4 className="footer-heading">Blog</h4>
            <ul className="footer-links">
              <li><Link href="/blog" className="footer-link">All Articles</Link></li>
              <li><Link href="/blog/how-to-sign-pdf-online" className="footer-link">How to Sign PDF Online</Link></li>
              <li><Link href="/blog/docusign-alternative-free" className="footer-link">Free DocuSign Alternative</Link></li>
              <li><Link href="/blog/sign-pdf-on-iphone-free" className="footer-link">Sign PDF on iPhone</Link></li>
              <li><Link href="/blog/fill-pdf-form-online-free" className="footer-link">Fill PDF Form Free</Link></li>
              <li><Link href="/blog/electronic-signature-laws-by-state" className="footer-link">E-Signature Laws</Link></li>
            </ul>
          </div>

          {/* Col 4 — Company */}
          <div>
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><Link href="/terms" className="footer-link">Terms of Service</Link></li>
              <li><Link href="/privacy" className="footer-link">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Col 5 — Support */}
          <div>
            <h4 className="footer-heading">Support</h4>
            <ul className="footer-links">
              <li>
                <a href="mailto:support@signmypdf.io" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  support@signmypdf.io
                </a>
              </li>
            </ul>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
              <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.7, margin: 0 }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>PIXELTIDE LLC</span><br />
                833 Saint Vincent<br />
                Irvine, CA 92618, USA
              </p>
            </div>
          </div>

        </div>

        {/* Divider + Copyright */}
        <div
          className="footer-copyright"
          style={{
            borderTop: '1px solid #1e293b',
            paddingTop: 20,
            paddingBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, color: '#334155' }}>
            © {new Date().getFullYear()} PIXELTIDE LLC. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/terms" className="footer-link footer-link-sm">Terms</Link>
            <Link href="/privacy" className="footer-link footer-link-sm">Privacy</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
