import type { Metadata } from 'next';
import Link from 'next/link';
import NavHeader from '../../components/NavHeader';
import SiteFooter from '../../components/SiteFooter';

export const metadata: Metadata = {
  // Root layout already appends " | SignMyPDF" — keep bare so the
  // browser tab / SERP reads
  //   "Support — Sign PDF Chrome Extension | SignMyPDF"
  // instead of "... | SignMyPDF | SignMyPDF".
  title: 'Support — Sign PDF Chrome Extension',
  description:
    'Get help with the Sign PDF Chrome extension. FAQ, contact information, and quick answers to common questions.',
  alternates: { canonical: '/extension/support' },
  openGraph: {
    title: 'Support — Sign PDF Chrome Extension',
    description:
      'Get help with the Sign PDF Chrome extension. FAQ, contact information, and quick answers to common questions.',
    url: '/extension/support',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  // Chrome Web Store listings link directly to the support URL —
  // keep indexable so reviewers can confirm the page is live.
};

const wrapStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '40px 20px',
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.6,
  color: '#334155',
};
const h1Style: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 8 };
const introStyle: React.CSSProperties = { fontSize: 16, color: '#334155', marginBottom: 32 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 };
const h3Style: React.CSSProperties = { fontSize: 16, fontWeight: 600, color: '#1e293b', marginTop: 24, marginBottom: 8 };
const pStyle: React.CSSProperties = { marginBottom: 16 };
const olStyle: React.CSSProperties = { paddingLeft: 24, marginBottom: 16 };
const ulStyle: React.CSSProperties = { paddingLeft: 24, marginBottom: 16 };
const linkStyle: React.CSSProperties = { color: '#2563eb' };
const hrStyle: React.CSSProperties = { margin: '40px 0 24px', border: 'none', borderTop: '1px solid #e2e8f0' };
const sigStyle: React.CSSProperties = { fontSize: 14, color: '#64748b', lineHeight: 1.6 };

export default function ExtensionSupportPage() {
  return (
    <>
      <NavHeader />
      <div style={wrapStyle}>
        <h1 style={h1Style}>Support — Sign PDF Chrome Extension</h1>
        <p style={introStyle}>Need help with the Sign PDF extension? We&apos;re here to help.</p>

        <h2 style={h2Style}>Quick answers</h2>

        <h3 style={h3Style}>How do I install Sign PDF?</h3>
        <p style={pStyle}>
          Visit the Chrome Web Store, click &quot;Add to Chrome&quot;, then pin the extension to your toolbar. The
          whole process takes 30 seconds.
        </p>

        <h3 style={h3Style}>How do I sign a PDF?</h3>
        <ol style={olStyle}>
          <li>Open any PDF in your browser, in Gmail, or in Google Drive</li>
          <li>Click the Sign PDF icon in your toolbar, or right-click any PDF link</li>
          <li>Draw, type, or upload your signature</li>
          <li>Place it on the document</li>
          <li>Download your signed PDF</li>
        </ol>

        <h3 style={h3Style}>Are my files private?</h3>
        <p style={pStyle}>
          Yes. Sign PDF runs entirely in your browser. Your files never leave your device — no uploads, no servers,
          no tracking.
        </p>

        <h3 style={h3Style}>Does it work on Mac, Windows, Chromebook?</h3>
        <p style={pStyle}>
          Yes. Sign PDF works on any Chromium-based browser (Chrome, Edge, Brave, Opera, Arc) on any operating
          system.
        </p>

        <h3 style={h3Style}>Is the extension free?</h3>
        <p style={pStyle}>Yes. Sign unlimited PDFs at no cost, no signup required.</p>

        <h3 style={h3Style}>I found a bug. What do I do?</h3>
        <p style={pStyle}>
          Email us at{' '}
          <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>{' '}
          with a description of what happened. We respond within 24 hours.
        </p>

        <h2 style={h2Style}>Contact us</h2>
        <p style={pStyle}>For all questions, bug reports, feature requests, or feedback:</p>
        <p style={pStyle}>
          <strong>Email:</strong>{' '}
          <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>
        </p>
        <p style={pStyle}>We typically respond within 24 hours.</p>

        <h2 style={h2Style}>More resources</h2>
        <ul style={ulStyle}>
          <li>
            <Link href="/sign-pdf-chrome-extension" style={linkStyle}>
              Sign PDF Chrome Extension page
            </Link>{' '}
            — features and installation
          </li>
          <li>
            <Link href="/extension/privacy" style={linkStyle}>
              Privacy Policy
            </Link>{' '}
            — how we handle your data
          </li>
          <li>
            <Link href="/" style={linkStyle}>
              All free PDF tools
            </Link>{' '}
            — Sign, Fill, Merge, Compress, Split, Protect
          </li>
        </ul>

        <hr style={hrStyle} />
        <p style={sigStyle}>
          SignMyPDF
          <br />
          Email: <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
