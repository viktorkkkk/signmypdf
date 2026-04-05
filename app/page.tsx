'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import SignatureCanvas from './components/SignatureCanvas';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'sign' | 'done'>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setStep('sign');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleSign = async () => {
    if (!pdfFile) return;
    if (signMode === 'draw' && !signatureData) {
      alert('Please draw your signature first');
      return;
    }
    if (signMode === 'type' && !typedName.trim()) {
      alert('Please type your name first');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('signatureData', signatureData);
      formData.append('typedName', typedName);
      formData.append('signMode', signMode);

      const response = await fetch('/api/sign', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Signing failed');

      const blob = await response.blob();
      setSignedPdfUrl(URL.createObjectURL(blob));
      setStep('done');
    } catch {
      alert('Error signing PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setSignedPdfUrl(null);
    setSignatureData('');
    setTypedName('');
    setStep('upload');
  };

  const canSign = signMode === 'draw' ? !!signatureData : !!typedName.trim();

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">✍️</div>
            <span className="logo-text">SignMyPDF</span>
          </div>
          <span className="header-badge">Free · Secure · Instant</span>
        </div>
      </header>

      <div className="container">

        {/* UPLOAD */}
        {step === 'upload' && (
          <div>
            <h1 className="hero-title">Sign your PDF in seconds</h1>
            <p className="hero-sub">No registration. No software. Just upload, sign, and download.</p>

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dropzone-icon">📄</div>
              <p className="dropzone-title">{isDragActive ? 'Drop your PDF here' : 'Drop your PDF here'}</p>
              <p className="dropzone-sub">or click to browse files</p>
              <button className="btn-primary" type="button">Choose PDF file</button>
            </div>

            <div className="features">
              {[
                { icon: '⚡', title: 'Instant', desc: 'Sign in under 30 seconds' },
                { icon: '🔒', title: 'Secure', desc: 'Files stay in your browser' },
                { icon: '✅', title: 'Legal', desc: 'Legally binding e-signature' },
              ].map(f => (
                <div className="feature-card" key={f.title}>
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SIGN */}
        {step === 'sign' && (
          <div>
            <div className="step-header">
              <button className="back-btn" onClick={handleReset}>← Back</button>
              <h2 className="step-title">Add your signature</h2>
            </div>

            <div className="sign-grid">
              {/* Left: Signature */}
              <div className="card">
                <div className="tabs">
                  <button className={`tab${signMode === 'draw' ? ' active' : ''}`} onClick={() => setSignMode('draw')}>✏️ Draw</button>
                  <button className={`tab${signMode === 'type' ? ' active' : ''}`} onClick={() => setSignMode('type')}>⌨️ Type</button>
                </div>

                {signMode === 'draw' && (
                  <SignatureCanvas onSave={setSignatureData} />
                )}

                {signMode === 'type' && (
                  <div>
                    <input
                      type="text"
                      className="type-input"
                      placeholder="Type your full name"
                      value={typedName}
                      onChange={e => setTypedName(e.target.value)}
                    />
                    {typedName && (
                      <div className="type-preview">
                        <div className="type-preview-label">Preview:</div>
                        <div className="type-preview-text">{typedName}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Doc + Button */}
              <div className="sign-right">
                <div className="card">
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: 12 }}>Document</div>
                  <div className="doc-info">
                    <div className="doc-icon">PDF</div>
                    <div>
                      <div className="doc-name">{pdfFile?.name}</div>
                      <div className="doc-size">{pdfFile ? (pdfFile.size / 1024).toFixed(0) + ' KB' : ''}</div>
                    </div>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '16px', fontSize: 17, borderRadius: 16, boxShadow: canSign ? '0 8px 24px rgba(37,99,235,0.3)' : 'none' }}
                  onClick={handleSign}
                  disabled={isProcessing || !canSign}
                >
                  {isProcessing ? <><span className="spinner" />Signing...</> : '✍️ Sign Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="done-center">
            <div className="done-icon">✅</div>
            <h2 className="done-title">Document signed!</h2>
            <p className="done-sub">Your PDF has been signed successfully.</p>

            <div className="done-actions">
              <a href={signedPdfUrl!} download={`signed-${pdfFile?.name}`} className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
                ⬇️ Download Signed PDF
              </a>
              <button className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }} onClick={handleReset}>
                Sign another document
              </button>
            </div>

            <div className="upsell">
              <div className="upsell-emoji">🚀</div>
              <div className="upsell-title">Sign unlimited documents</div>
              <div className="upsell-sub">You've used your free document. Get unlimited signatures for just $4.99/month.</div>
              <button className="upsell-btn">Upgrade — $4.99/month</button>
              <div className="upsell-fine">Cancel anytime. No hidden fees.</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
