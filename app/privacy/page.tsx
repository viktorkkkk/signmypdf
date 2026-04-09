export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#334155' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Privacy Policy
      </h1>
      
      <p style={{ marginBottom: 16 }}>
        This Privacy Policy describes how SignMyPDF ("we", "us", or "our") collects, 
        uses, and protects information when you use our online PDF signing service.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        1. Data Processing
      </h2>
      <p style={{ marginBottom: 16 }}>
        1.1. All PDF operations are performed exclusively in your browser. 
        We do not upload, store, or process your documents on our servers.
      </p>
      <p style={{ marginBottom: 16 }}>
        1.2. Document history and signatures are saved locally in your browser 
        using localStorage and are never transmitted to our servers.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        2. What Data We Collect
      </h2>
      <p style={{ marginBottom: 16 }}>
        2.1. We do not require registration and do not collect personal data from users.
      </p>
      <p style={{ marginBottom: 16 }}>
        2.2. We may collect anonymous usage statistics (number of signed documents, 
        error types) to improve the Service.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        3. Use of Cookies
      </h2>
      <p style={{ marginBottom: 16 }}>
        3.1. We use cookies and localStorage only for technical functionality 
        (saving settings, document history).
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        4. Security
      </h2>
      <p style={{ marginBottom: 16 }}>
        4.1. We take all necessary measures to protect user data. 
        Since all data is stored locally in your browser, 
        security is maintained on the user side.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        5. Policy Changes
      </h2>
      <p style={{ marginBottom: 16 }}>
        5.1. We reserve the right to modify this Privacy Policy. 
        The updated version is published on this page.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        6. Contact
      </h2>
      <p style={{ marginBottom: 16 }}>
        For questions regarding this Privacy Policy, 
        please contact us: support@signmypdf.io
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: '#64748b' }}>
        Last updated: {new Date().toLocaleDateString('en-US')}
      </p>
    </div>
  );
}
