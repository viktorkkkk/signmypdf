'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import SignatureCanvas from './components/SignatureCanvas';
import PlacementPicker, { zoneToPdfCoords, PlacementState } from './components/PlacementPicker';
import Logo from './components/Logo';
import FileHistory, { saveToHistory } from './components/FileHistory';

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
  const sigSize = useRef({ w: 0, h: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [selectedZone, setSelectedZone] = useState(6);
  const [sigScale, setSigScale] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const signPosition = useRef({ page: 1, x: 50, y: 80, pageWidth: 595, pageHeight: 842 });

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f || f.type !== 'application/pdf') return;
    setPdfFile(f);
    // Detect page count cheaply via PDFDocument
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(await f.arrayBuffer());
      const n = doc.getPageCount();
      setTotalPages(n);
      setSelectedPage(n); // default: last page
      signPosition.current.page = n;
      const page = doc.getPage(n - 1);
      const { width, height } = page.getSize();
      signPosition.current.pageWidth  = width;
      signPosition.current.pageHeight = height;
    } catch { setTotalPages(1); setSelectedPage(1); }
    setStep('sign');
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
      const coords = zoneToPdfCoords(selectedZone, signPosition.current.pageWidth, signPosition.current.pageHeight, sigScale);
      fd.append('signPage', String(selectedPage));
      fd.append('signX', String(coords.x));
      fd.append('signY', String(coords.y));
      fd.append('pageWidth', String(signPosition.current.pageWidth));
      fd.append('pageHeight', String(signPosition.current.pageHeight));
      fd.append('sigW', String(sigSize.current.w * sigScale));
      fd.append('sigH', String(sigSize.current.h * sigScale));

      const res = await fetch('/api/sign', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

      // Save to history
      const reader = new FileReader();
      reader.onload = () => {
        saveToHistory(pdfFile!.name, blob.size, reader.result as string);
        window.dispatchEvent(new Event('signmypdf:saved'));
      };
      reader.readAsDataURL(blob);

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

                  {signMode === 'draw' && <SignatureCanvas onSave={(url, w, h) => { setSignatureData(url); sigSize.current = { w, h }; }} />}

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
                  <div className="card-title">Where to place signature</div>
                  <div className="doc-row" style={{ marginBottom: 16 }}>
                    <div className="doc-badge">PDF</div>
                    <div>
                      <div className="doc-name">{pdfFile?.name}</div>
                      <div className="doc-size">{pdfFile ? (pdfFile.size / 1024).toFixed(0) + ' KB' : ''}</div>
                    </div>
                  </div>
                  <PlacementPicker
                    signatureDataUrl={previewSig}
                    totalPages={totalPages}
                    selectedPage={selectedPage}
                    onPageChange={(p) => { setSelectedPage(p); signPosition.current.page = p; }}
                    selectedZone={selectedZone}
                    sigScale={sigScale}
                    onPlacement={(zone, scale) => { setSelectedZone(zone); setSigScale(scale); }}
                  />
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

            {/* Pricing */}
            <div className="pricing-wrap">
              <div className="pricing-header">
                <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
                <h3 className="pricing-title">Unlock unlimited signatures</h3>
                <p className="pricing-sub">You've used your free document. Choose a plan to keep signing.</p>
              </div>

              <div className="pricing-grid">
                {/* Monthly */}
                <div className="plan-card">
                  <div className="plan-name">Monthly</div>
                  <div className="plan-price">$4.99<span>/mo</span></div>
                  <div className="plan-desc">Billed monthly. Cancel anytime.</div>
                  <ul className="plan-perks">
                    <li>✓ Unlimited documents</li>
                    <li>✓ Download history</li>
                    <li>✓ Priority support</li>
                  </ul>
                  <button className="plan-btn">Get Monthly</button>
                </div>

                {/* Annual — featured */}
                <div className="plan-card plan-featured">
                  <div className="plan-badge">Most Popular</div>
                  <div className="plan-name">Annual</div>
                  <div className="plan-price">$3.25<span>/mo</span></div>
                  <div className="plan-desc">$39/year — save 35% vs monthly.</div>
                  <ul className="plan-perks">
                    <li>✓ Unlimited documents</li>
                    <li>✓ Download history</li>
                    <li>✓ Priority support</li>
                    <li>✓ 1 year document storage</li>
                  </ul>
                  <button className="plan-btn plan-btn-featured">Get Annual — $39/yr</button>
                </div>

                {/* Lifetime */}
                <div className="plan-card">
                  <div className="plan-name">Lifetime</div>
                  <div className="plan-price">$79<span> once</span></div>
                  <div className="plan-desc">Pay once, use forever.</div>
                  <ul className="plan-perks">
                    <li>✓ Unlimited documents</li>
                    <li>✓ Lifetime storage</li>
                    <li>✓ All future features</li>
                    <li>✓ Priority support forever</li>
                  </ul>
                  <button className="plan-btn">Get Lifetime</button>
                </div>
              </div>

              <p className="pricing-fine">Secure payment · No hidden fees · Instant access</p>
            </div>
          </div>
        )}

      </div>

      {/* File History — sticky bottom bar */}
      <FileHistory onUpgrade={() => setShowPricing(true)} />

      {/* Pricing modal */}
      {showPricing && (
        <div className="modal-overlay" onClick={() => setShowPricing(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPricing(false)}>✕</button>
            <div className="pricing-header">
              <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
              <h3 className="pricing-title">Unlock unlimited signatures</h3>
              <p className="pricing-sub">Choose a plan to keep signing without limits.</p>
            </div>
            <div className="pricing-grid">
              <div className="plan-card">
                <div className="plan-name">Monthly</div>
                <div className="plan-price">$4.99<span>/mo</span></div>
                <div className="plan-desc">Billed monthly. Cancel anytime.</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited documents</li>
                  <li>✓ Download history</li>
                  <li>✓ Priority support</li>
                </ul>
                <button className="plan-btn">Get Monthly</button>
              </div>
              <div className="plan-card plan-featured">
                <div className="plan-badge">Most Popular</div>
                <div className="plan-name">Annual</div>
                <div className="plan-price">$3.25<span>/mo</span></div>
                <div className="plan-desc">$39/year — save 35%.</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited documents</li>
                  <li>✓ Download history</li>
                  <li>✓ Priority support</li>
                  <li>✓ 1 year document storage</li>
                </ul>
                <button className="plan-btn plan-btn-featured">Get Annual — $39/yr</button>
              </div>
              <div className="plan-card">
                <div className="plan-name">Lifetime</div>
                <div className="plan-price">$79<span> once</span></div>
                <div className="plan-desc">Pay once, use forever.</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited documents</li>
                  <li>✓ Lifetime storage</li>
                  <li>✓ All future features</li>
                  <li>✓ Priority support forever</li>
                </ul>
                <button className="plan-btn">Get Lifetime</button>
              </div>
            </div>
            <p className="pricing-fine">Secure payment · No hidden fees · Instant access</p>
          </div>
        </div>
      )}
    </>
  );
}
