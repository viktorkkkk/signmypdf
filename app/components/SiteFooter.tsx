import Link from 'next/link';
import Logo from './Logo';

export default function SiteFooter() {
  return (
    <footer style={{
      background: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
      paddingTop: 48,
      paddingBottom: 32,
      marginTop: 64,
    }}>
      <div className="container">
        <div className="footer-grid" style={{ marginBottom: 40 }}>

          {/* Brand */}
          <div>
            <Link href="/" className="footer-brand">
              <Logo />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: -0.3 }}>SignMyPDF</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Free PDF Signing Tool</span>
              </div>
            </Link>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, maxWidth: 220, margin: '12px 0 0' }}>
              Sign and fill PDF documents online — free, private, and without registration.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="footer-heading">Tools</h4>
            <ul className="footer-links">
              <li><Link href="/" className="footer-link">✍️ Sign PDF</Link></li>
              <li><Link href="/fill" className="footer-link">📝 Fill PDF Form</Link></li>
            </ul>
          </div>

          {/* Blog */}
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

          {/* Legal */}
          <div>
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><Link href="/terms" className="footer-link">Terms of Service</Link></li>
              <li><Link href="/privacy" className="footer-link">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="footer-heading">Company</h4>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, margin: '0 0 10px' }}>
              PIXELTIDE LLC<br />
              833 Saint Vincent<br />
              Irvine, CA 92618, USA
            </p>
            <Link href="mailto:support@signmypdf.io" className="footer-link">
              support@signmypdf.io
            </Link>
          </div>
        </div>

        {/* Bottom copyright */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            © {new Date().getFullYear()} PIXELTIDE LLC. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/terms" className="footer-link" style={{ fontSize: 12 }}>Terms</Link>
            <Link href="/privacy" className="footer-link" style={{ fontSize: 12 }}>Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
