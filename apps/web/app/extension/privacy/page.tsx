import type { Metadata } from 'next';
import NavHeader from '../../components/NavHeader';
import SiteFooter from '../../components/SiteFooter';

export const metadata: Metadata = {
  // Root layout already appends " | SignMyPDF" — keep this title
  // bare so the SERP / browser tab reads
  //   "Privacy Policy — Sign PDF Chrome Extension | SignMyPDF"
  // instead of the doubled "... | SignMyPDF | SignMyPDF".
  title: 'Privacy Policy — Sign PDF Chrome Extension',
  description:
    "Privacy policy for the Sign PDF Chrome extension. We don't collect or store any of your data. All PDF processing happens in your browser.",
  alternates: { canonical: '/extension/privacy' },
  openGraph: {
    title: 'Privacy Policy — Sign PDF Chrome Extension',
    description:
      "Privacy policy for the Sign PDF Chrome extension. We don't collect or store any of your data. All PDF processing happens in your browser.",
    url: '/extension/privacy',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  // Chrome Web Store reviewers prefer this page to be indexable so they
  // can confirm it stays online. Default Next.js robots: index, follow.
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
const dateStyle: React.CSSProperties = { fontSize: 14, color: '#64748b', marginBottom: 32 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 };
const pStyle: React.CSSProperties = { marginBottom: 16 };
const ulStyle: React.CSSProperties = { paddingLeft: 24, marginBottom: 16 };
const linkStyle: React.CSSProperties = { color: '#2563eb' };
const olStyle: React.CSSProperties = { paddingLeft: 24, marginBottom: 16 };
const hrStyle: React.CSSProperties = { margin: '40px 0 24px', border: 'none', borderTop: '1px solid #e2e8f0' };
const sigStyle: React.CSSProperties = { fontSize: 14, color: '#64748b', lineHeight: 1.6 };

export default function ExtensionPrivacyPage() {
  return (
    <>
      <NavHeader />
      <div style={wrapStyle}>
        <h1 style={h1Style}>Privacy Policy — Sign PDF Chrome Extension</h1>
        <p style={dateStyle}>Last updated: 2026-05-19</p>

        <h2 style={h2Style}>Overview</h2>
        <p style={pStyle}>
          Sign PDF is a Chrome browser extension that allows you to sign and fill PDF documents directly in your
          browser. This Privacy Policy explains how we handle your data when you use Sign PDF.
        </p>
        <p style={pStyle}>
          <strong>Short version: We don&apos;t collect, store, or transmit any of your data. Everything stays on
          your device.</strong>
        </p>

        <h2 style={h2Style}>Data we collect</h2>
        <p style={pStyle}>
          <strong>None.</strong>
        </p>
        <p style={pStyle}>
          Sign PDF processes all PDF files entirely within your browser using JavaScript. The extension does not:
        </p>
        <ul style={ulStyle}>
          <li>Upload your PDF files to any server</li>
          <li>Send your signatures to any server</li>
          <li>Track your usage, clicks, or behavior</li>
          <li>Collect analytics or telemetry data</li>
          <li>Use cookies or local storage to track you</li>
          <li>Share data with third parties</li>
        </ul>

        <h2 style={h2Style}>How your files are processed</h2>
        <p style={pStyle}>When you use Sign PDF:</p>
        <ol style={olStyle}>
          <li>You open a PDF in your browser</li>
          <li>The extension reads the PDF locally on your device</li>
          <li>You add signatures, text, or dates</li>
          <li>The extension generates the signed PDF on your device</li>
          <li>You download the signed file directly to your computer</li>
        </ol>
        <p style={pStyle}>At no point do your files leave your browser.</p>

        <h2 style={h2Style}>Permissions explained</h2>
        <p style={pStyle}>
          Sign PDF requests the following Chrome permissions, used solely for the extension to function:
        </p>
        <ul style={ulStyle}>
          <li>
            <strong>contextMenus</strong> — Adds the &quot;Sign with Sign PDF&quot; option to right-click menus on
            PDF links
          </li>
          <li>
            <strong>downloads</strong> — Saves your signed PDF file to your Downloads folder
          </li>
          <li>
            <strong>storage</strong> — Stores your extension preferences (such as default signature style) locally
            on your device
          </li>
        </ul>
        <p style={pStyle}>
          None of these permissions access your other tabs, browsing history, or any data outside the extension
          itself.
        </p>

        <h2 style={h2Style}>Third parties</h2>
        <p style={pStyle}>
          We do not use any third-party services, analytics tools, advertising networks, or tracking pixels within
          the extension.
        </p>

        <h2 style={h2Style}>Data security</h2>
        <p style={pStyle}>
          Because we don&apos;t collect or store your data, there&apos;s nothing to leak or steal. Your documents are
          as secure as your own computer.
        </p>

        <h2 style={h2Style}>Children&apos;s privacy</h2>
        <p style={pStyle}>
          Sign PDF is suitable for all ages. We do not knowingly collect any data from users of any age — because we
          don&apos;t collect any data at all.
        </p>

        <h2 style={h2Style}>Changes to this policy</h2>
        <p style={pStyle}>
          If we ever change how the extension works in a way that affects privacy, we&apos;ll update this page and
          notify users through the extension itself.
        </p>

        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>
          Questions about this Privacy Policy? Email us at{' '}
          <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>.
        </p>

        <hr style={hrStyle} />
        <p style={sigStyle}>
          SignMyPDF
          <br />
          Email: <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>
          <br />
          Website: <a href="https://www.signmypdf.io" style={linkStyle}>https://www.signmypdf.io</a>
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
