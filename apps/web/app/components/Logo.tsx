'use client';

export default function Logo() {
  return (
    <svg width="60" height="70" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Document with folded corner */}
      <rect x="15" y="10" width="85" height="110" rx="2" fill="white" stroke="#d1d5db" strokeWidth="2"/>
      <path d="M85 10 L85 35 L100 35 L100 25 L100 10 Z" fill="white"/>
      <path d="M85 10 L85 35 L100 35 L85 10 Z" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1"/>
      
      {/* Sign text - red */}
      <text x="25" y="45" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="600" fill="#ef4444">Sign</text>
      
      {/* My text - black */}
      <text x="25" y="75" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="600" fill="#1f2937">My</text>
      
      {/* PDF badge */}
      <rect x="12" y="95" width="50" height="22" rx="4" fill="#ef4444"/>
      <text x="37" y="111" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">PDF</text>
      
      {/* Signature box with dashed border */}
      <rect x="60" y="88" width="45" height="32" rx="2" fill="white" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2"/>
      
      {/* Signature scribble */}
      <path d="M68 108 Q72 98, 75 108 T82 105 T88 102 T95 108" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M75 108 L85 98" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      
      {/* Blue resize handle */}
      <rect x="102" y="117" width="6" height="6" fill="#3b82f6" rx="1"/>
    </svg>
  );
}
