'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import SignatureCanvas from './components/SignatureCanvas';
import PDFPreview from './components/PDFPreview';
import Logo from './components/Logo';

type Step = 'upload' | 'sign' | 'done';

const STEPS = [
  { id: 'upload', label: 'Upload PDF' },
  { id: 'sign',   label: 'Add Signature' },
  { id: 'done',   label: 'Download' },
];

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const signPosition = useRef({ page: 1, x: 100, y: 80, pageWidth: 595, pageHeight: 842 });

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f?.type === 'application/pdf') { setPdfFile(f); setStep('sign'); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const canSign = signMode === 'draw' ? !!signatureData : !!typedName.trim();

  const handleSign = async () => {
    if (!pdfFile || !canSign) return;
    setIsProcessing(true);
    try {
      const fd = new FormData();
      fd.append('pdf', pdfFile);
      fd.append('signatureData', signatureData);
      fd.append('typedName', typedName);
      fd.append('signMode', signMode);
      fd.append('signPage', String(signPosition.current.page));
      fd.append('signX', String(signPosition.current.x));
      fd.append('signY', String(signPosition.current.y));
      fd.append('pageWidth', String(signPosition.current.pageWidth));
      fd.append('pageHeight', String(signPosition.current.pageHeight));

      const res = await fetch('/api/sign', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      setSignedPdfUrl(URL.createObjectURL(await res.blob()));
      setStep('done');
    } catch {
      alert('Error signing PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPdfFile(null); setSignedPdfUrl(null);
    setSignatureData(''); setTypedName(''); setStep('upload');
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const previewSig = signMode === 'draw' ? signatureData : '';

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <a href="/" className="logo"><Logo /></a>
          <span className="header-tag">🔒 No registration required</span>
        </div>
      </header>

      {/* Progress */}
      {step !== 'upload' && (
        <div className="progress-wrap">
          <div className="progress-steps">
            {STEPS.map((s, i) => {
              const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'idle';
              return (
                <div className="progress-step" key={s.id}>
                  <div className={`step-circle ${state}`}>{state === 'done' ? '✓' : i + 1}</div>
                  <span className={`step-label ${state}`}>{s.label}</span>
                  {i < STEPS.length - 1 && <div className={`step-line ${state === 'done' ? 'done' : ''}`} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="container">

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div>
            <h1 className="hero-title">Sign your PDF in seconds</h1>
            <p className="hero-sub">No registration. No software. Upload, sign, download — done.</p>
            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon">📄</div>
              <p className="dz-title">{isDragActive ? 'Drop it here!' : 'Drop your PDF here'}</p>
              <p className="dz-sub">or click to select a file from your computer</p>
              <button className="btn-primary" type="button">Choose PDF file</button>
            </div>
            <div className="features">
              {[
                { icon: '⚡', title: 'Instant signing', desc: 'Done in under 30 seconds' },
                { icon: '🔒', title: 'Private & secure', desc: 'File stays in your browser' },
                { icon: '✅', title: 'Legally binding', desc: 'Accepted worldwide' },
              ].map(f => (
                <div className="feat" key={f.title}>
                  <div className="feat-icon">{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SIGN ── */}
        {step === 'sign' && (
          <div>
            <div className="step-header">
              <button className="back-btn" onClick={reset}>← Back</button>
              <h2 className="step-title">Add your signature</h2>
            </div>

            <div className="sign-layout">
              {/* Left: draw signature */}
              <div className="sign-left">
                <div className="card">
                  <div className="card-title">Your signature</div>
                  <div className="tabs">
                    <button className={`tab${signMode === 'draw' ? ' active' : ''}`} onClick={() => setSignMode('draw')}>✏️ Draw</button>
                    <button className={`tab${signMode === 'type' ? ' active' : ''}`} onClick={() => setSignMode('type')}>⌨️ Type name</button>
                  </div>

                  {signMode === 'draw' && <SignatureCanvas onSave={setSignatureData} />}

                  {signMode === 'type' && (
                    <div>
                      <input
                        type="text"
                        className="type-input"
                        placeholder="Your full name"
                        value={typedName}
                        onChange={e => setTypedName(e.target.value)}
                      />
                      {typedName && (
                        <div className="type-preview">
                          <span className="type-preview-text">{typedName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className="btn-primary full"
                  style={{ padding: '16px', fontSize: 16, borderRadius: 16, marginTop: 4 }}
                  onClick={handleSign}
                  disabled={isProcessing || !canSign}
                >
                  {isProcessing
                    ? <><span className="spinner" /> Signing your PDF...</>
                    : '✍️  Sign & Download'}
                </button>
                {!canSign && (
                  <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    {signMode === 'draw' ? '↑ Draw your signature above first' : '↑ Type your name above first'}
                  </p>
                )}
              </div>

              {/* Right: PDF preview */}
              <div className="sign-right">
                <div className="card">
                  <div className="card-title">
                    Document preview
                    {signatureData && <span style={{ color: '#22c55e', marginLeft: 8, fontWeight: 600 }}>· drag to reposition</span>}
                  </div>
                  <div className="doc-row" style={{ marginBottom: 16 }}>
                    <div className="doc-badge">PDF</div>
                    <div>
                      <div className="doc-name">{pdfFile?.name}</div>
                      <div className="doc-size">{pdfFile ? (pdfFile.size / 1024).toFixed(0) + ' KB' : ''}</div>
                    </div>
                  </div>
                  {pdfFile && (
                    <PDFPreview
                      file={pdfFile}
                      signatureDataUrl={previewSig}
                      onPositionChange={(page, x, y, pw, ph) => {
                        signPosition.current = { page, x, y, pageWidth: pw, pageHeight: ph };
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">🎉</div>
            <h2 className="done-title">Document signed!</h2>
            <p className="done-sub">Your PDF is ready to download and send.</p>
            <div className="done-btns">
              <a href={signedPdfUrl!} download={`signed-${pdfFile?.name}`} className="btn-primary" style={{ padding: '15px 36px', fontSize: 16 }}>
                ⬇️  Download Signed PDF
              </a>
              <button className="btn-ghost" style={{ padding: '15px 28px', fontSize: 15 }} onClick={reset}>
                Sign another document
              </button>
            </div>
            <div className="upsell">
              <div className="upsell-emoji">🚀</div>
              <div className="upsell-title">Want unlimited signatures?</div>
              <div className="upsell-sub">You've used your free document. Upgrade for unlimited signing — no limits, ever.</div>
              <div className="upsell-price">$4.99 <span>/ month</span></div>
              <div className="upsell-perks">
                <span className="upsell-perk">✓ Unlimited documents</span>
                <span className="upsell-perk">✓ Download history</span>
                <span className="upsell-perk">✓ Priority support</span>
              </div>
              <button className="upsell-btn">Upgrade now — $4.99/mo</button>
              <div className="upsell-fine">Cancel anytime · No hidden fees · Instant access</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
