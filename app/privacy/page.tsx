import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — SignMyPDF',
  description: 'Privacy Policy for SignMyPDF online PDF signing service.',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#334155' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>Last updated: April 14, 2026</p>

      <p style={{ marginBottom: 16 }}>
        This Privacy Policy describes how <strong>PIXELTIDE LLC</strong> ("Company", "we", "us", or "our"),
        operating SignMyPDF at <a href="https://www.signmypdf.io" style={{ color: '#2563eb' }}>signmypdf.io</a>,
        collects, uses, and protects information when you use our Service.
      </p>
      <p style={{ marginBottom: 16 }}>
        Company address: 833 Saint Vincent, Irvine, CA 92618, USA.<br />
        Contact: <a href="mailto:support@signmypdf.io" style={{ color: '#2563eb' }}>support@signmypdf.io</a>
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        1. Your Documents Stay on Your Device
      </h2>
      <p style={{ marginBottom: 16 }}>
        All PDF signing operations are performed entirely within your web browser.
        Your documents are <strong>never uploaded to our servers</strong>. We have no access
        to the content of your files. Document history and saved signatures are stored
        locally in your browser's localStorage and remain on your device.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        2. Information We Collect
      </h2>
      <p style={{ marginBottom: 12 }}>
        <strong>No account required.</strong> We do not collect names, email addresses,
        or any personal data for free use of the Service.
      </p>
      <p style={{ marginBottom: 12 }}>
        <strong>Premium subscribers:</strong> When you purchase a premium plan, our payment
        processor collects your payment information (name, email, card details).
        We receive only the confirmation of payment — we do not store your card data.
      </p>
      <p style={{ marginBottom: 16 }}>
        <strong>Usage data:</strong> We may collect anonymous, aggregated analytics
        (page views, feature usage counts) to improve the Service. This data cannot
        be used to identify individual users.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        3. Cookies and Local Storage
      </h2>
      <p style={{ marginBottom: 16 }}>
        We use browser localStorage only for technical functionality:
      </p>
      <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
        <li>Saving your daily signature count (free tier limit)</li>
        <li>Storing saved signatures (draw/type) you choose to keep</li>
        <li>Storing premium subscription status</li>
        <li>Document signing history (stored only on your device)</li>
      </ul>
      <p style={{ marginBottom: 16 }}>
        We may use essential cookies for session management and analytics cookies
        (e.g. Google Analytics) to understand aggregate usage. You can disable cookies
        in your browser settings at any time.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        4. Payment Processing
      </h2>
      <p style={{ marginBottom: 16 }}>
        Premium subscriptions are processed by our third-party payment provider.
        Your payment data is handled directly by the payment processor under their
        own privacy policy and PCI-DSS compliance. We do not store or have access
        to your credit card details.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        5. How We Use Information
      </h2>
      <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
        <li>To provide and improve the Service</li>
        <li>To process and manage premium subscriptions</li>
        <li>To send transactional emails (receipts, subscription updates) to premium users</li>
        <li>To comply with legal obligations</li>
      </ul>
      <p style={{ marginBottom: 16 }}>
        We do not sell, rent, or share your personal data with third parties for
        marketing purposes.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        6. Data Retention
      </h2>
      <p style={{ marginBottom: 16 }}>
        Since we do not store your documents or personal data on our servers, there
        is nothing to delete on our end. Document history in your browser can be
        cleared at any time by clearing your browser's localStorage or using
        your browser's "Clear site data" option.
      </p>
      <p style={{ marginBottom: 16 }}>
        For premium subscribers, we retain billing records as required by applicable
        tax and accounting laws (typically 7 years).
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        7. Your Rights (GDPR / CCPA)
      </h2>
      <p style={{ marginBottom: 12 }}>
        Depending on your location, you may have the right to:
      </p>
      <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
        <li>Access the personal data we hold about you</li>
        <li>Request correction or deletion of your data</li>
        <li>Object to or restrict processing of your data</li>
        <li>Data portability</li>
        <li>Withdraw consent at any time</li>
        <li>Lodge a complaint with your local data protection authority</li>
      </ul>
      <p style={{ marginBottom: 16 }}>
        California residents (CCPA): we do not sell personal information.
        To exercise any of your rights, contact us at{' '}
        <a href="mailto:support@signmypdf.io" style={{ color: '#2563eb' }}>support@signmypdf.io</a>.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        8. Security
      </h2>
      <p style={{ marginBottom: 16 }}>
        The Service is served over HTTPS. Because all document processing happens
        in your browser, your documents are never in transit to our servers.
        We implement industry-standard security practices for any data we do handle.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        9. Children's Privacy
      </h2>
      <p style={{ marginBottom: 16 }}>
        The Service is not directed at children under 13 years of age. We do not
        knowingly collect personal information from children under 13.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        10. Changes to This Policy
      </h2>
      <p style={{ marginBottom: 16 }}>
        We may update this Privacy Policy from time to time. We will notify you of
        material changes by posting a notice on our website. Continued use of the
        Service after changes constitutes acceptance of the updated Policy.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        11. Contact Us
      </h2>
      <p style={{ marginBottom: 8 }}>
        <strong>PIXELTIDE LLC</strong><br />
        833 Saint Vincent, Irvine, CA 92618, USA<br />
        Email: <a href="mailto:support@signmypdf.io" style={{ color: '#2563eb' }}>support@signmypdf.io</a>
      </p>
    </div>
  );
}
