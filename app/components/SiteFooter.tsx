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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1.2fr',
          gap: 40,
          marginBottom: 40,
        }}
          className="footer-grid"
        >
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 12 }}>
              <Logo />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: -0.3 }}>SignMyPDF</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Free PDF Signing Tool</span>
              </div>
            </Link>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, maxWidth: 220, margin: 0 }}>
              Sign and fill PDF documents online — free, private, and without registration.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Tools
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { href: '/', label: '✍️ Sign PDF' },
                { href: '/fill', label: '📝 Fill PDF Form' },
              ].map(({ href, label }) => (
                <li key={href} style={{ marginBottom: 8 }}>
                  <Link href={href} style={{ fontSize: 13, color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Blog */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Blog
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { href: '/blog', label: 'All Articles' },
                { href: '/blog/how-to-sign-pdf-online', label: 'How to Sign PDF Online' },
                { href: '/blog/docusign-alternative-free', label: 'Free DocuSign Alternative' },
                { href: '/blog/sign-pdf-on-iphone-free', label: 'Sign PDF on iPhone' },
                { href: '/blog/fill-pdf-form-online-free', label: 'Fill PDF Form Free' },
                { href: '/blog/electronic-signature-laws-by-state', label: 'E-Signature Laws' },
              ].map(({ href, label }) => (
                <li key={href} style={{ marginBottom: 8 }}>
                  <Link href={href} style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { href: '/terms', label: 'Terms of Service' },
                { href: '/privacy', label: 'Privacy Policy' },
              ].map(({ href, label }) => (
                <li key={href} style={{ marginBottom: 8 }}>
                  <Link href={href} style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  >{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Company
            </h4>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8, margin: '0 0 10px' }}>
              PIXELTIDE LLC<br />
              833 Saint Vincent<br />
              Irvine, CA 92618, USA
            </p>
            <a href="mailto:support@signmypdf.io" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              support@signmypdf.io
            </a>
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
            <Link href="/terms" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>Terms</Link>
            <Link href="/privacy" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
