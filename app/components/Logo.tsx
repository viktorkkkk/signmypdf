export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Icon */}
      <div style={{
        width: 52, height: 52,
        background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* PDF sheet */}
        <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
          <rect x="1" y="1" width="20" height="28" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
          <path d="M15 1 L15 8 L22 8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          {/* PDF label */}
          <text x="4" y="22" fontFamily="Arial" fontWeight="900" fontSize="7" fill="white" letterSpacing="0.3">PDF</text>
          {/* Signature stroke */}
          <path d="M4 27 Q8 23 12 27 Q15 29 18 26" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      {/* Text */}
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.5px', color: '#0f172a' }}>
          Sign<span style={{ color: '#2563eb' }}>My</span>PDF
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, letterSpacing: '0.2px' }}>
          Free · Instant · Secure
        </div>
      </div>
    </div>
  );
}
