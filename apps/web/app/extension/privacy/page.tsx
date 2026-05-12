import type { Metadata } from 'next';
import NavHeader from '../../components/NavHeader';
import SiteFooter from '../../components/SiteFooter';

export const metadata: Metadata = {
  // Root layout already appends " | SignMyPDF" — keep this title
  // bare so the SERP / browser tab reads
  //   "Privacy Policy — Chrome Extension | SignMyPDF"
  // instead of the doubled "... | SignMyPDF | SignMyPDF".
  title: 'Privacy Policy, Chrome Extension',
  description:
    'Privacy policy for the SignMyPDF Chrome extension. What data the extension collects, what it does not, and how the extension talks to signmypdf.io.',
  alternates: { canonical: '/extension/privacy' },
  openGraph: {
    title: 'Privacy Policy, SignMyPDF Chrome Extension',
    description:
      'What the SignMyPDF Chrome extension collects, what it does not, and how the extension talks to signmypdf.io.',
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

export default function ExtensionPrivacyPage() {
  return (
    <>
      <NavHeader />
      <div style={wrapStyle}>
        <h1 style={h1Style}>Privacy Policy, SignMyPDF Chrome Extension</h1>
        <p style={dateStyle}>Last updated: 2026-05-11</p>

        <p style={pStyle}>
          This page describes how the <strong>SignMyPDF Chrome extension</strong> handles your data. It is
          published by <strong>PIXELTIDE LLC</strong>, the company behind{' '}
          <a href="https://www.signmypdf.io" style={linkStyle}>signmypdf.io</a>. For the full website privacy policy,
          see <a href="/privacy" style={linkStyle}>signmypdf.io/privacy</a>.
        </p>
        <p style={pStyle}>
          Company address: 833 Saint Vincent, Irvine, CA 92618, USA.
          <br />
          Contact: <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>.
        </p>

        <h2 style={h2Style}>What the extension collects</h2>
        <p style={pStyle}>The extension is designed to collect as little as possible:</p>
        <ol style={ulStyle}>
          <li>
            <strong>PDF files you choose to sign</strong> — stored temporarily in your browser&apos;s local extension
            storage (<code>chrome.storage.local</code>) and deleted within 60 seconds after transfer to{' '}
            <a href="https://www.signmypdf.io/sign" style={linkStyle}>signmypdf.io/sign</a>, or when you close
            the popup, whichever comes first.
          </li>
          <li>
            <strong>Anonymous usage events</strong> — extension installed, popup opened, PDF dropped, context menu
            used. Sent to Google Analytics 4 with a random per-install client ID. No personal data, no file
            content, no URLs you visit.
          </li>
        </ol>

        <h2 style={h2Style}>What the extension does NOT collect</h2>
        <ul style={ulStyle}>
          <li>We do not read PDFs from websites you visit.</li>
          <li>We do not track your browsing history.</li>
          <li>We do not collect personal information (name, email, address).</li>
          <li>We do not sell, rent, or share any data with third parties.</li>
        </ul>

        <h2 style={h2Style}>Permissions explained</h2>
        <ul style={ulStyle}>
          <li>
            <strong>storage</strong> — to temporarily hold your PDF in extension storage before transfer to{' '}
            <a href="https://www.signmypdf.io" style={linkStyle}>signmypdf.io</a>.
          </li>
          <li>
            <strong>contextMenus</strong> — to show <em>Sign with SignMyPDF</em> when you right-click a PDF link.
          </li>
          <li>
            <strong>activeTab</strong> — to read the URL of a PDF link you right-click on (only when you click the
            menu item; we never read pages on our own).
          </li>
          <li>
            <strong>host_permissions: signmypdf.io</strong> — so the content-script bridge can hand the PDF from
            extension storage to the page when you arrive at <code>/sign</code>.
          </li>
        </ul>
        <p style={pStyle}>
          We do not request <code>&lt;all_urls&gt;</code>, <code>tabs</code>, or <code>downloads</code> permissions.
        </p>

        <h2 style={h2Style}>What happens after the file reaches signmypdf.io</h2>
        <p style={pStyle}>
          Once a PDF is transferred to <a href="https://www.signmypdf.io/sign" style={linkStyle}>signmypdf.io/sign</a>:
        </p>
        <ul style={ulStyle}>
          <li>
            <strong>Free users:</strong> the PDF is processed entirely in your browser — signing, watermarking, and
            downloading all happen client-side. The file is never sent to our servers.
          </li>
          <li>
            <strong>Pro users:</strong> if you opt in to cross-device sync from the dashboard, signed files may be
            encrypted in transit and at rest, retained for one year, and deletable on demand.
          </li>
        </ul>
        <p style={pStyle}>
          The website&apos;s full data handling — analytics, payments, retention — is covered in the main{' '}
          <a href="/privacy" style={linkStyle}>SignMyPDF Privacy Policy</a>.
        </p>

        <h2 style={h2Style}>Children</h2>
        <p style={pStyle}>
          The extension is not directed to children under 13. We do not knowingly collect data from children.
        </p>

        <h2 style={h2Style}>Changes to this policy</h2>
        <p style={pStyle}>
          We will update the &quot;Last updated&quot; date above and, where required, post a notice on{' '}
          <a href="https://www.signmypdf.io" style={linkStyle}>signmypdf.io</a> if we make material changes.
        </p>

        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>
          For privacy questions or to exercise any data rights you may have under GDPR / CCPA / similar laws,
          email <a href="mailto:support@signmypdf.io" style={linkStyle}>support@signmypdf.io</a>. We typically
          respond within 24 hours.
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
