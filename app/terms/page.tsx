import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — SignMyPDF',
  description: 'Terms of Service for SignMyPDF online PDF signing service.',
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#334155' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>Last updated: April 14, 2026</p>

      <p style={{ marginBottom: 16 }}>
        These Terms of Service ("Terms") govern your access to and use of SignMyPDF
        (the "Service"), operated by <strong>PIXELTIDE LLC</strong>, a limited liability company
        registered in California, USA, with its principal place of business at
        833 Saint Vincent, Irvine, CA 92618 ("Company", "we", "us", or "our").
      </p>
      <p style={{ marginBottom: 16 }}>
        By accessing or using our Service you agree to be bound by these Terms.
        If you do not agree, do not use the Service.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        1. Description of Service
      </h2>
      <p style={{ marginBottom: 16 }}>
        SignMyPDF provides a browser-based tool for electronically signing PDF documents.
        All PDF processing is performed locally in your browser — documents are never
        uploaded to our servers.
      </p>
      <p style={{ marginBottom: 16 }}>
        The Service is available in two tiers:
      </p>
      <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
        <li><strong>Free tier:</strong> up to 2 signed documents per day at no charge.</li>
        <li><strong>Premium plans:</strong> unlimited signing, saved signatures, and download history.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        2. Subscriptions and Billing
      </h2>
      <p style={{ marginBottom: 16 }}>
        Premium access is available on the following plans:
      </p>
      <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
        <li><strong>Weekly:</strong> $2.99 per week, recurring.</li>
        <li><strong>Annual:</strong> $39.00 per year (equivalent to $3.25/month), recurring.</li>
        <li><strong>Lifetime:</strong> $79.00 one-time payment, no recurring charges.</li>
      </ul>
      <p style={{ marginBottom: 16 }}>
        Payments are processed by our authorized payment processor. Subscriptions renew
        automatically at the end of each billing period unless cancelled before the renewal date.
      </p>
      <p style={{ marginBottom: 16 }}>
        You may cancel your subscription at any time from your account settings or by
        contacting us at <a href="mailto:support@signmypdf.io" style={{ color: '#2563eb' }}>support@signmypdf.io</a>.
        Cancellation takes effect at the end of the current billing period.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        3. Refund Policy
      </h2>
      <p style={{ marginBottom: 16 }}>
        We offer a <strong>14-day money-back guarantee</strong> on all premium plans.
        If you are not satisfied with the Service for any reason, contact us within
        14 days of purchase at{' '}
        <a href="mailto:support@signmypdf.io" style={{ color: '#2563eb' }}>support@signmypdf.io</a>{' '}
        and we will issue a full refund — no questions asked.
      </p>
      <p style={{ marginBottom: 16 }}>
        Refund requests submitted after 14 days of purchase will be evaluated on a
        case-by-case basis. We reserve the right to decline refunds for accounts that
        show signs of abuse.
      </p>
      <p style={{ marginBottom: 16 }}>
        Lifetime plan purchases are eligible for a refund within 14 days of purchase.
      </p>
      <p style={{ marginBottom: 16 }}>
        EU/EEA consumers: in accordance with EU consumer law, you have the right to
        withdraw from a digital services contract within 14 days of purchase without
        giving any reason, provided you have not already started using the premium features.
        By explicitly requesting immediate access to premium features, you acknowledge
        that your right of withdrawal may be forfeited.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        4. User Responsibilities
      </h2>
      <p style={{ marginBottom: 16 }}>
        4.1. You agree to use the Service only for lawful purposes.
      </p>
      <p style={{ marginBottom: 16 }}>
        4.2. You are solely responsible for the content of documents you process
        through the Service and for ensuring you have the right to sign them.
      </p>
      <p style={{ marginBottom: 16 }}>
        4.3. You must not attempt to reverse-engineer, scrape, or abuse the Service.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        5. Intellectual Property
      </h2>
      <p style={{ marginBottom: 16 }}>
        The Service and all its original content, features, and functionality are and
        will remain the exclusive property of PIXELTIDE LLC. You may not copy,
        reproduce, or distribute any part of the Service without our prior written consent.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        6. Limitation of Liability
      </h2>
      <p style={{ marginBottom: 16 }}>
        6.1. The Service is provided "as is" without warranties of any kind.
      </p>
      <p style={{ marginBottom: 16 }}>
        6.2. PIXELTIDE LLC shall not be liable for any indirect, incidental, special,
        or consequential damages arising from your use of the Service.
      </p>
      <p style={{ marginBottom: 16 }}>
        6.3. Our total liability to you shall not exceed the amount you paid us in the
        12 months preceding the event giving rise to the claim.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        7. Governing Law
      </h2>
      <p style={{ marginBottom: 16 }}>
        These Terms are governed by the laws of the State of California, USA.
        Any disputes shall be resolved in the courts of Orange County, California.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        8. Changes to Terms
      </h2>
      <p style={{ marginBottom: 16 }}>
        We may update these Terms from time to time. We will notify you of significant
        changes by posting a notice on our website. Continued use of the Service after
        changes constitutes acceptance of the updated Terms.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        9. Contact
      </h2>
      <p style={{ marginBottom: 8 }}>
        <strong>PIXELTIDE LLC</strong><br />
        833 Saint Vincent, Irvine, CA 92618, USA<br />
        Email: <a href="mailto:support@signmypdf.io" style={{ color: '#2563eb' }}>support@signmypdf.io</a>
      </p>
    </div>
  );
}
