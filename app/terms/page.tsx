export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#334155' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Terms of Service
      </h1>
      
      <p style={{ marginBottom: 16 }}>
        This document constitutes the Terms of Service for SignMyPDF 
        governing the use of our online PDF signing service.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        1. General Provisions
      </h2>
      <p style={{ marginBottom: 16 }}>
        1.1. These Terms of Service ("Terms") constitute a binding agreement 
        between SignMyPDF ("Provider") and any individual or entity ("User") 
        accessing or using our Service.
      </p>
      <p style={{ marginBottom: 16 }}>
        1.2. By using the Service, you accept and agree to be bound by these Terms.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        2. Service Description
      </h2>
      <p style={{ marginBottom: 16 }}>
        2.1. SignMyPDF provides an online service for electronically signing PDF documents.
      </p>
      <p style={{ marginBottom: 16 }}>
        2.2. The Service includes a free tier (2 signatures per day) and premium subscription plans.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        3. User Responsibilities
      </h2>
      <p style={{ marginBottom: 16 }}>
        3.1. You agree to use the Service only for lawful purposes.
      </p>
      <p style={{ marginBottom: 16 }}>
        3.2. You are solely responsible for the content of documents you process through the Service.
      </p>
      <p style={{ marginBottom: 16 }}>
        3.3. Premium subscriptions are non-refundable except as required by law.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        4. Limitation of Liability
      </h2>
      <p style={{ marginBottom: 16 }}>
        4.1. SignMyPDF is not responsible for the content of documents processed through the Service.
      </p>
      <p style={{ marginBottom: 16 }}>
        4.2. We do not guarantee that the Service will be uninterrupted or error-free.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        5. Changes to Terms
      </h2>
      <p style={{ marginBottom: 16 }}>
        5.1. We reserve the right to modify these Terms at any time. 
        Changes are effective upon posting to this page.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        6. Contact
      </h2>
      <p style={{ marginBottom: 16 }}>
        For questions about these Terms, contact us: support@signmypdf.io
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: '#64748b' }}>
        Last updated: {new Date().toLocaleDateString('en-US')}
      </p>
    </div>
  );
}
