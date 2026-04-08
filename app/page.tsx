'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import SignatureCanvas from './components/SignatureCanvas';
import PDFViewer, { SignaturePlacement } from './components/PDFViewer';
import SavedSignatures, { saveSig, SavedSig } from './components/SavedSignatures';
import Logo from './components/Logo';
import FileHistory, { saveToHistory, HistoryItem } from './components/FileHistory';
import { signPdfInBrowser } from './utils/signPdf';

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
  const [selectedFont, setSelectedFont] = useState('"Brush Script MT", "Dancing Script", cursive');
  
  const FONTS = [
    { name: 'Script', value: '"Brush Script MT", "Dancing Script", cursive' },
    { name: 'Handwritten', value: '"Comic Sans MS", "Chalkboard SE", cursive' },
    { name: 'Elegant', value: '"Times New Roman", Georgia, serif' },
    { name: 'Modern', value: '"Segoe UI", Roboto, sans-serif' },
  ];
  const [showPricing, setShowPricing] = useState(false);
  const [isFirstDoc, setIsFirstDoc] = useState<boolean | null>(null);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState<HistoryItem | null>(null);
  
  // Multi-page signature state
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  

  
  // Generate dataUrl for typed signature
  const [typedSigDataUrl, setTypedSigDataUrl] = useState('');
  useEffect(() => {
    if (!typedName.trim()) {
      setTypedSigDataUrl('');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 48px ${selectedFont}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    setTypedSigDataUrl(canvas.toDataURL('image/png'));
  }, [typedName, selectedFont]);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f?.type === 'application/pdf') { 
      setPdfFile(f); 
      setStep('sign');
      // Auto-select first page for immediate preview
      setSelectedPages([1]);
      setPlacements([{ page: 1, x: 5, y: 75, w: 30, h: 12 }]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  const canSign = (signMode === 'draw' ? !!signatureData : !!typedName.trim()) && selectedPages.length > 0;

  const handleSign = async () => {
    if (!pdfFile || !canSign) return;
    setIsProcessing(true);
    try {
      // 100% client-side — no server, no size limits
      const blob = await signPdfInBrowser({
        pdfFile,
        signatureDataUrl: signatureData,
        typedName,
        signMode: signMode as 'draw' | 'type',
        placements: placements.filter(p => selectedPages.includes(p.page)),
      });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

      // Auto-download immediately
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed-${pdfFile.name}`;
      a.click();

      // Save to history
      const reader = new FileReader();
      reader.onload = () => {
        saveToHistory(pdfFile!.name, blob.size, reader.result as string);
        window.dispatchEvent(new Event('signmypdf:saved'));
      };
      reader.readAsDataURL(blob);

      // Optional: show done screen after short delay, or stay on current screen
      setTimeout(() => {
        setStep('done');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 500);
    } catch (err: any) {
      console.error('handleSign error:', err);
      alert('Error signing PDF: ' + (err?.message || 'unknown'));
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPdfFile(null); 
    setSignedPdfUrl(null);
    setSignatureData(''); 
    setTypedName(''); 
    setStep('upload');
    setSelectedPages([]);
    setPlacements([]);
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const previewSig = signMode === 'draw' ? signatureData : typedSigDataUrl;

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
              <h2 className="step-title">Sign your document</h2>
            </div>
            {/* File bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
              <div className="doc-badge" style={{ width: 32, height: 32, fontSize: 9, flexShrink: 0 }}>PDF</div>
              <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile?.name}</span>
              <button onClick={reset} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>🔄 Change file</button>
            </div>

            {/* 1. SIGNATURE AREA (top) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">1. Create your signature</div>
              <div className="tabs">
                <button className={`tab${signMode === 'draw' ? ' active' : ''}`} onClick={() => setSignMode('draw')}>✏️ Draw</button>
                <button className={`tab${signMode === 'type' ? ' active' : ''}`} onClick={() => setSignMode('type')}>⌨️ Type</button>
              </div>

              {signMode === 'draw' && <SignatureCanvas onSave={(url, w, h) => { setSignatureData(url); sigSize.current = { w, h }; }} />}

              {signMode === 'type' && (
                <div>
                  {/* Font selector */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {FONTS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setSelectedFont(f.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: selectedFont === f.value ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: selectedFont === f.value ? '#eff6ff' : 'white',
                          color: selectedFont === f.value ? '#2563eb' : '#64748b',
                          fontSize: 13,
                          fontWeight: selectedFont === f.value ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: f.value,
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                  <input type="text" className="type-input" placeholder="Your full name"
                    value={typedName} onChange={e => setTypedName(e.target.value)} 
                    style={{ fontFamily: selectedFont, fontSize: 24 }} />
                  {typedName && (
                    <div className="type-preview" style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={typedSigDataUrl} style={{ maxHeight: 60, maxWidth: '100%' }} alt="typed signature" />
                    </div>
                  )}
                </div>
              )}

              {/* Saved signatures */}
              <div style={{ marginTop: 14 }}>
                <SavedSignatures
                  currentSig={signMode === 'draw' ? signatureData : typedSigDataUrl}
                  currentType={signMode}
                  currentText={typedName}
                  currentFont={selectedFont}
                  selectedId={selectedSigId}
                  onSelect={(sig: SavedSig) => { 
                    setSelectedSigId(sig.id);
                    if (sig.type === 'type' && sig.text) {
                      setTypedName(sig.text);
                      setSelectedFont(sig.font || FONTS[0].value);
                      setSignMode('type');
                    } else {
                      setSignatureData(sig.dataUrl);
                      setSignMode('draw');
                    }
                  }}
                  onSaveCurrent={() => { 
                    if (signMode === 'draw' && signatureData) {
                      const newSig = saveSig(signatureData, 'draw');
                      setSelectedSigId(newSig.id);
                      window.dispatchEvent(new Event('signmypdf:sigs'));
                    } else if (signMode === 'type' && typedName && typedSigDataUrl) {
                      const newSig = saveSig(typedSigDataUrl, 'type', typedName, selectedFont);
                      setSelectedSigId(newSig.id);
                      window.dispatchEvent(new Event('signmypdf:sigs'));
                    }
                  }}
                />
              </div>
            </div>

            {/* 2. DOCUMENT PREVIEW (below) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">2. Select pages & place signature</div>
              {pdfFile && (
                <PDFViewer
                  file={pdfFile}
                  signatureDataUrl={previewSig}
                  placements={placements}
                  selectedPages={selectedPages}
                  onPlacementsChange={setPlacements}
                  onSelectedPagesChange={setSelectedPages}
                />
              )}
            </div>

            {/* Sign button */}
            <button
              className="btn-primary full"
              style={{ padding: '16px', fontSize: 16, borderRadius: 16 }}
              onClick={handleSign}
              disabled={isProcessing || !canSign}
            >
              {isProcessing
                ? <><span className="spinner" /> Signing...</>
                : `✍️  Sign ${selectedPages.length > 0 ? selectedPages.length + ' page' + (selectedPages.length > 1 ? 's' : '') : ''} & Download`}
            </button>
            
            {selectedPages.length === 0 && (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                Select at least one page to sign above
              </p>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">🎉</div>
            <h2 className="done-title">Document signed!</h2>
            <p className="done-sub">Your PDF with {selectedPages.length} signature{selectedPages.length > 1 ? 's' : ''} is ready.</p>

            <div className="done-btns">
              <a href={signedPdfUrl!} download={`signed-${pdfFile?.name}`} className="btn-primary" style={{ padding: '15px 36px', fontSize: 16 }}>
                ⬇️  Download Signed PDF
              </a>
              <button className="btn-ghost" style={{ padding: '15px 28px', fontSize: 15 }} onClick={reset}>
                Sign another document
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#22c55e', textAlign: 'center', marginTop: -12, marginBottom: 24, fontWeight: 600 }}>
              ✅ Document saved — check your downloads folder
            </p>
          </div>
        )}

      </div>

      {/* File History — sticky bottom bar */}
      <div className="container">
      <FileHistory 
        onDownload={(item: HistoryItem) => {
          const a = document.createElement('a');
          a.href = item.dataUrl;
          a.download = `signed-${item.name}`;
          a.click();
        }}
      />
      </div>

      {/* Pricing removed - all features free */}
    </>
  );
}
