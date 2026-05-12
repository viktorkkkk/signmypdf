/**
 * The Chrome browser brand mark — the recognisable four-segment
 * circle. `lucide-react@1.14` ships no Chrome icon, so we render
 * the glyph inline. Used on the /chrome landing CTAs and on the
 * `<ExtensionBanner />` install nudge.
 */
export default function ChromeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Red top sector */}
      <path fill="#EA4335" d="M24 4a20 20 0 0 1 17.32 10H24a10 10 0 0 0-8.66 5L9.04 8.06A19.94 19.94 0 0 1 24 4z" />
      {/* Yellow bottom-left sector */}
      <path fill="#FBBC05" d="M4 24a20 20 0 0 1 5.04-13.94l8.92 15.46a10 10 0 0 0 5.79 8.65L18.07 43.4A20 20 0 0 1 4 24z" />
      {/* Green bottom-right sector */}
      <path fill="#34A853" d="M24 44a20 20 0 0 1-5.93-.6L26.7 28.5a10 10 0 0 0 9.4-5.62l5.91 10.24A20 20 0 0 1 24 44z" />
      {/* White inner ring */}
      <circle cx="24" cy="24" r="9" fill="#FFFFFF" />
      {/* Blue centre */}
      <circle cx="24" cy="24" r="6.5" fill="#4285F4" />
    </svg>
  );
}
