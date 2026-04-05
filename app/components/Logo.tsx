export default function Logo() {
  return (
    <svg width="160" height="40" viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* PDF icon */}
      <rect x="0" y="4" width="28" height="34" rx="4" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5"/>
      {/* Page fold */}
      <path d="M18 4 L28 14" stroke="#BFDBFE" strokeWidth="1.5"/>
      <path d="M18 4 L18 14 L28 14" fill="#DBEAFE"/>
      {/* PDF text */}
      <text x="4" y="28" fontFamily="Arial" fontWeight="900" fontSize="8" fill="#2563EB" letterSpacing="0.5">PDF</text>
      {/* Signature pen stroke on the doc */}
      <path d="M6 32 Q11 28 16 32 Q18 33 20 31" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" fill="none"/>

      {/* Brand name */}
      <text x="36" y="18" fontFamily="-apple-system, BlinkMacSystemFont, Arial" fontWeight="800" fontSize="15" fill="#0F172A" letterSpacing="-0.3">Sign</text>
      <text x="66" y="18" fontFamily="-apple-system, BlinkMacSystemFont, Arial" fontWeight="800" fontSize="15" fill="#2563EB" letterSpacing="-0.3">My</text>
      <text x="85" y="18" fontFamily="-apple-system, BlinkMacSystemFont, Arial" fontWeight="800" fontSize="15" fill="#0F172A" letterSpacing="-0.3">PDF</text>

      {/* Tagline */}
      <text x="36" y="32" fontFamily="-apple-system, BlinkMacSystemFont, Arial" fontWeight="400" fontSize="9.5" fill="#94A3B8" letterSpacing="0.2">Free · Instant · Secure</text>
    </svg>
  );
}
