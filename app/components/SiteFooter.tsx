import Link from 'next/link';
import Logo from './Logo';

export default function SiteFooter() {
  return (
    <footer style={{
      background: '#0f172a',
      paddingTop: 56,
      paddingBottom: 0,
      marginTop: 'auto',
    }}>
      <div className="container">

        {/* Main grid */}
        <div className="footer-grid" style={{ marginBottom: 48 }}>

          {/* Col 1 — Brand */}
          <div>
            <Link href="/" className="footer-brand" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <Logo />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>SignMyPDF</span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Sign &amp; Fill PDF Online</span>
              </div>
            </Link>

            <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.3, textTransform: 'uppercase', margin: '16px 0 6px' }}>
              Sign &amp; Fill PDF Online — No Registration
            </p>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, maxWidth: 240, margin: '0 0 20px' }}>
              Fast, private PDF tools. No software. No account required.
            </p>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { href: '#', label: 'X / Twitter', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                )},
                { href: '#', label: 'LinkedIn', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                )},
                { href: '#', label: 'Facebook', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )},
              ].map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  className="footer-social-icon"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Tools */}
          <div>
            <h4 className="footer-heading">Tools</h4>
            <ul className="footer-links">
              <li><Link href="/" className="footer-link">Sign PDF</Link></li>
              <li><Link href="/fill" className="footer-link">Fill PDF Form</Link></li>
              <li><Link href="/blog" className="footer-link">Blog</Link></li>
            </ul>
          </div>

          {/* Col 3 — Guides */}
          <div>
            <h4 className="footer-heading">Guides</h4>
            <ul className="footer-links">
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
            <div style={{ marginTop: 16 }}>
              <a href="mailto:support@signmypdf.io" className="footer-link" style={{ display: 'block', marginBottom: 8 }}>
                support@signmypdf.io
              </a>
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                PIXELTIDE LLC<br />
                Irvine, CA, USA
              </p>
            </div>
          </div>
        </div>

        {/* Divider + Copyright */}
        <div style={{
          borderTop: '1px solid #1e293b',
          paddingTop: 20,
          paddingBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
          className="footer-copyright"
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
