'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  DollarSign,
  Smartphone,
  PenLine,
  Lock,
  FileText,
  Check,
  MapPin,
  Download,
  Link2,
  Upload,
} from 'lucide-react';
import { BlogPost } from '../posts';
import NavHeader from '../../components/NavHeader';
import SiteFooter from '../../components/SiteFooter';
import BlogPdfUploader from '../../components/BlogPdfUploader';

// ─── Tool category per article ──────────────────────────────────
// Each article is routed to the tool that best matches its topic. This
// determines the CTA button destination, hero copy, sticky CTA, etc.
export type ArticleTool = 'sign' | 'fill' | 'protect';

// Slugs for articles about filling PDFs (not signing)
const FILL_SLUGS = new Set([
  'fill-pdf-form-online-free',
  'fill-w9-form-online-free',
  'fill-irs-form-online-free',
  'fill-rental-application-pdf-free',
  'fill-medical-release-form-online',
  'eidas-fill-pdf-eu',
  'pdf-form-fields-not-working-fix',
  'pdf-wont-let-me-type-fix',
  'fill-job-application-pdf-online',
  'fill-government-forms-online-free',
  'fill-visa-application-form-pdf',
  'fill-bank-form-pdf-online',
  'fill-college-application-pdf',
  'fill-insurance-claim-form-pdf',
  'fill-medical-history-form-pdf',
  // Comparison/alternative articles where Fill is the primary recommendation
  'hellosign-alternatives-free',
  'pandadoc-free-alternative',
  'smallpdf-vs-signmypdf',
  'docusign-free-plan-vs-signmypdf',
  'zoho-sign-vs-signmypdf',
  'signnow-free-alternative',
  'adobe-fill-sign-vs-signmypdf',
]);

// Slugs for articles about password protection / encryption.
// Kept explicit so the classifier never misclassifies a comparison or
// scenario article where the heuristic below wouldn't catch it.
const PROTECT_SLUGS = new Set([
  // Launch
  'password-protect-pdf-online-free',
  // How-to (max 6 per rotation per Rule 8)
  'password-protect-pdf-without-adobe',
  'password-protect-pdf-on-mac',
  'password-protect-pdf-on-windows-11',
  'password-protect-pdf-on-iphone',
  'remove-password-from-pdf-you-own',
  'password-protect-pdf-free-online-no-software',
  // Pain / scenario
  'sent-confidential-contract-unprotected',
  'why-lawyer-asks-password-protect-pdf',
  'accountant-wont-accept-unprotected-tax-documents',
  'what-happens-if-protected-pdf-leaks',
  'is-password-protected-pdf-actually-secure',
  'biggest-mistake-protecting-pdfs',
  'just-email-it-isnt-enough-for-sensitive-documents',
  'hr-pdf-resume-protection',
  // Comparisons
  'adobe-vs-free-pdf-protection',
  'password-pdf-vs-encrypted-email',
  'zip-password-vs-pdf-password',
  'smallpdf-vs-ilovepdf-vs-signmypdf-protection',
  'dropbox-password-links-vs-protected-pdfs',
  // Explainer
  'pdf-encryption-explained-plain-english',
  'aes-128-vs-aes-256-pdf',
  'owner-password-vs-user-password',
  'can-protected-pdf-be-hacked',
  // Troubleshooting
  'forgot-my-pdf-password-options',
  'protected-pdf-wont-open-some-devices',
  'protected-pdf-keeps-asking-password',
  // Use cases
  'freelancers-protect-client-contracts',
  'real-estate-agents-protect-property-documents',
  'medical-practices-hipaa-pdf-sharing',
  'financial-advisors-protect-client-statements',
  // Listicles
  '7-document-types-always-password-protect',
  'password-strength-checklist-pdfs-2026',
]);

export function getArticleTool(slug: string): ArticleTool {
  // Broader heuristic covers future protect-related slugs without a set update.
  if (
    PROTECT_SLUGS.has(slug) ||
    slug.includes('password-protect') ||
    slug.includes('protect-pdf') ||
    slug.includes('protected-pdf') ||
    slug.includes('pdf-password') ||
    slug.includes('pdf-encryption') ||
    slug.includes('pdf-protection') ||
    slug.includes('encrypt-pdf') ||
    slug.includes('lock-pdf')
  ) {
    return 'protect';
  }
  if (FILL_SLUGS.has(slug) || slug.startsWith('fill-') || slug.includes('-fill-')) {
    return 'fill';
  }
  return 'sign';
}

// Tool metadata used by CTAs
const TOOL_META: Record<ArticleTool, {
  href: string;
  ctaLong: string;
  ctaShort: string;
  finalTitle: string;
  finalSub: string;
  heroSub: string;
  defaultCtaTitle: string;
  defaultCtaBtn: string;
}> = {
  sign: {
    href: '/sign',
    ctaLong: 'Sign PDF Now — Free',
    ctaShort: 'Sign PDF Now – Free',
    finalTitle: 'Ready to sign your PDF?',
    finalSub: 'Join thousands of users who trust SignMyPDF for fast, free document signing.',
    heroSub: 'Sign your PDF in seconds — no registration, no downloads',
    defaultCtaTitle: 'Ready to Sign Your PDF?',
    defaultCtaBtn: 'Sign PDF Free Now',
  },
  fill: {
    href: '/fill',
    ctaLong: 'Fill PDF Now — Free',
    ctaShort: 'Fill PDF Now – Free',
    finalTitle: 'Ready to fill your PDF?',
    finalSub: 'Join thousands of users who trust SignMyPDF for fast, free PDF form filling.',
    heroSub: 'Fill your PDF in seconds — no registration, no downloads',
    defaultCtaTitle: 'Ready to Fill Your PDF?',
    defaultCtaBtn: 'Fill PDF Free Now',
  },
  protect: {
    href: '/protect',
    ctaLong: 'Protect PDF Now — Free',
    ctaShort: 'Protect PDF Now – Free',
    finalTitle: 'Ready to protect your PDF?',
    finalSub: 'Add a password to any PDF in under a minute — free, private, no registration required.',
    heroSub: 'Password-protect your PDF in seconds — no registration, no uploads',
    defaultCtaTitle: 'Ready to Protect Your PDF?',
    defaultCtaBtn: 'Protect PDF Free Now',
  },
};

// Sticky CTA Component
function StickyCTA({ tool }: { tool: ArticleTool }) {
  const [isVisible, setIsVisible] = useState(false);
  const meta = TOOL_META[tool];

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling past 400px (past hero section)
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="sticky-cta-mobile"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        zIndex: 100,
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <Link
        href={meta.href}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 24px',
          background: '#2563eb',
          color: 'white',
          fontWeight: 700,
          fontSize: 15,
          borderRadius: 12,
          textDecoration: 'none',
          width: '100%',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {meta.ctaLong}
      </Link>
    </div>
  );
}

// FAQ Accordion Component — answer always in DOM for SEO, CSS controls visibility
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          padding: '20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
          {question}
        </span>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {/* Always rendered in DOM so Googlebot can index the answer text */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isOpen ? '400px' : '0',
        transition: 'max-height 0.3s ease',
        paddingBottom: isOpen ? 20 : 0,
        fontSize: 15, color: '#475569', lineHeight: 1.7,
      }}>
        {answer}
      </div>
    </div>
  );
}

// Quick Summary component shown at top of every article
// Pick a lucide icon component based on the QuickSummary label text.
function iconForLabel(label: string): React.ReactElement {
  const l = label.toLowerCase();
  const props = { size: 22, color: '#2563eb', strokeWidth: 2 } as const;
  if (l.includes('time') || l.includes('duration')) return <Clock {...props} />;
  if (l.includes('cost') || l.includes('price')) return <DollarSign {...props} />;
  if (l.includes('work') || l.includes('device') || l.includes('platform')) return <Smartphone {...props} />;
  if (l.includes('registr') || l.includes('account') || l.includes('sign up')) return <PenLine {...props} />;
  if (l.includes('secur') || l.includes('priva')) return <Lock {...props} />;
  if (l.includes('file') || l.includes('size') || l.includes('limit')) return <FileText {...props} />;
  return <Check {...props} />;
}

interface QuickSummaryItem { icon: React.ReactElement; label: string; value: string }

// Shared card — used both by the hardcoded default and the parser output.
function QuickSummaryCard({ items }: { items: QuickSummaryItem[] }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', marginBottom: 40 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Quick Summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Parse a [QuickSummary] line payload (pipe-separated `Label: Value` pairs).
// Returns an empty array if the payload is malformed.
function parseQuickSummary(payload: string): QuickSummaryItem[] {
  return payload
    .split('|')
    .map(part => {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) return null;
      const label = part.slice(0, colonIdx).trim();
      const value = part.slice(colonIdx + 1).trim();
      if (!label || !value) return null;
      return { label, value, icon: iconForLabel(label) };
    })
    .filter((x): x is QuickSummaryItem => x !== null);
}

// Fallback block shown when article content doesn't include its own [QuickSummary].
function DefaultQuickSummary() {
  const props = { size: 22, color: '#2563eb', strokeWidth: 2 } as const;
  const items: QuickSummaryItem[] = [
    { icon: <Clock {...props} />, label: 'Time', value: 'Under 60 seconds' },
    { icon: <DollarSign {...props} />, label: 'Cost', value: 'Free (2 PDFs/day)' },
    { icon: <Smartphone {...props} />, label: 'Works on', value: 'All devices' },
    { icon: <PenLine {...props} />, label: 'Registration', value: 'Not required' },
  ];
  return <QuickSummaryCard items={items} />;
}

// Render inline bold/links within a string
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**')) {
      parts.push(<strong key={key++} style={{ color: '#0f172a' }}>{match[0].slice(2, -2)}</strong>);
    } else {
      parts.push(<a key={key++} href={match[3]} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>{match[2]}</a>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Parse content
function formatContent(content: string, tool: ArticleTool = 'sign') {
  const meta = TOOL_META[tool];
  return content
    .split('\n\n')
    .map((block, i) => {
      const trimmed = block.trim();

      // QuickSummary block [QuickSummary]Label: Value|Label: Value|...
      if (trimmed.startsWith('[QuickSummary]')) {
        const payload = trimmed.slice('[QuickSummary]'.length).trim();
        const items = parseQuickSummary(payload);
        if (items.length === 0) return null; // malformed → drop, don't leak raw text
        return <div key={i}><QuickSummaryCard items={items} /></div>;
      }

      // Drop orphan closing tags (e.g. "[/CALLOUT]" alone in its own block).
      // These appear when an opening [CALLOUT] is on one block and its
      // [/CALLOUT] is on a separate block (via blank line). Without this
      // guard the closing tag would leak through to the page as plain text.
      if (/^\[\/[A-Z][A-Za-z0-9]*\]$/.test(trimmed)) {
        return null;
      }

      // Callout block [CALLOUT]text  (closing [/CALLOUT] tolerated and stripped)
      if (trimmed.startsWith('[CALLOUT]')) {
        const text = trimmed
          .slice('[CALLOUT]'.length)
          .replace(/\[\/CALLOUT\]\s*$/i, '')
          .trim();
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', background: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '0 12px 12px 0', marginBottom: 24, marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 15, color: '#1e40af', lineHeight: 1.7, fontWeight: 500 }}>{text}</p>
          </div>
        );
      }

      // Step card: ### Step N: Title\nBody text
      if (/^### Step \d+[:.]/i.test(trimmed)) {
        const lines = trimmed.split('\n');
        const headerLine = lines[0];
        const bodyText = lines.slice(1).join(' ').trim();
        const stepMatch = headerLine.match(/^### Step (\d+)[:.]\s*(.+)/i);
        if (stepMatch) {
          const stepNum = parseInt(stepMatch[1]);
          const stepTitle = stepMatch[2].trim();
          const STEP_ICONS = [FileText, PenLine, MapPin, Download, Link2, Upload];
          const StepIcon = STEP_ICONS[(stepNum - 1) % STEP_ICONS.length];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>
                {stepNum}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#0f172a', marginBottom: bodyText ? 8 : 0 }}>{stepTitle}</div>
                {bodyText && <p style={{ margin: 0, fontSize: 15, color: '#475569', lineHeight: 1.7 }}>{renderInline(bodyText)}</p>}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, color: '#64748b' }}>
                <StepIcon size={26} strokeWidth={1.8} />
              </span>
            </div>
          );
        }
      }

      // CTA Block
      if (trimmed.startsWith('[CTA]')) {
        const parts = trimmed.slice(5).split('|');
        const ctaTitle = parts[0]?.trim() || meta.defaultCtaTitle;
        const ctaSub = parts[1]?.trim() || '';
        const ctaBtn = parts[2]?.trim() || meta.defaultCtaBtn;
        const ctaHref = meta.href;
        return (
          <div key={i} style={{ margin: '48px 0', padding: '40px 32px', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 24, textAlign: 'center', boxShadow: '0 20px 60px rgba(37,99,235,0.3)' }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: -0.3 }}>{ctaTitle}</h2>
            {ctaSub && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 28 }}>{ctaSub}</p>}
            <Link href={ctaHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 32px', background: 'white', color: '#2563eb', fontWeight: 800, fontSize: 16, borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              {ctaBtn} →
            </Link>
          </div>
        );
      }

      // Table (lines starting with |)
      if (trimmed.startsWith('|')) {
        const rows = trimmed.split('\n').map(r => r.trim()).filter(r => r.startsWith('|'));
        const isSep = (r: string) => /^\|[-| :]+\|$/.test(r);
        const parseRow = (r: string) => r.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
        const headers = parseRow(rows[0] || '');
        const dataRows = rows.slice(2).filter(r => !isSep(r)).map(parseRow);
        return (
          <div key={i} style={{ overflowX: 'auto', marginBottom: 28, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 360 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {headers.map((cell, j) => (
                    <th key={j} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, j) => (
                  <tr key={j} style={{ borderBottom: '1px solid #e2e8f0', background: j % 2 === 0 ? 'white' : '#f8fafc' }}>
                    {row.map((cell, k) => (
                      <td key={k} style={{ padding: '12px 16px', color: '#475569' }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={i} style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginTop: 48, marginBottom: 20, letterSpacing: -0.5 }}>
            {trimmed.slice(2)}
          </h1>
        );
      }
      
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={i} style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 40, marginBottom: 16 }}>
            {trimmed.slice(3)}
          </h2>
        );
      }
      
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={i} style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 12 }}>
            {trimmed.slice(4)}
          </h3>
        );
      }
      
      if (trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
        return (
          <ul key={i} style={{ listStyle: 'disc', paddingLeft: 24, marginBottom: 20, color: '#475569', lineHeight: 1.8 }}>
            {items.map((item, j) => <li key={j}>{renderInline(item.trim().slice(2))}</li>)}
          </ul>
        );
      }
      
      if (/^\d+\./.test(trimmed)) {
        const items = trimmed.split('\n').filter(line => /^\d+\./.test(line.trim()));
        return (
          <ol key={i} style={{ listStyle: 'decimal', paddingLeft: 24, marginBottom: 20, color: '#475569', lineHeight: 1.8 }}>
            {items.map((item, j) => <li key={j}>{renderInline(item.trim().replace(/^\d+\.\s*/, ''))}</li>)}
          </ol>
        );
      }
      
      let text = trimmed;
      const boldParts: (string | React.ReactNode)[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      let keyCounter = 0;
      
      // Helper to parse links within text
      const parseLinks = (content: string): React.ReactNode[] => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts: React.ReactNode[] = [];
        let linkLastIndex = 0;
        let linkMatch;
        let linkKey = 0;
        
        while ((linkMatch = linkRegex.exec(content)) !== null) {
          if (linkMatch.index > linkLastIndex) {
            parts.push(content.slice(linkLastIndex, linkMatch.index));
          }
          parts.push(
            <Link key={linkKey++} href={linkMatch[2]} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>
              {linkMatch[1]}
            </Link>
          );
          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }
        if (linkLastIndex < content.length) {
          parts.push(content.slice(linkLastIndex));
        }
        return parts.length > 0 ? parts : [content];
      };
      
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) boldParts.push(text.slice(lastIndex, match.index));
        const innerContent = match[1];
        // Check if inner content has links
        if (innerContent.includes('](')) {
          boldParts.push(<strong key={keyCounter++} style={{ color: '#0f172a' }}>{parseLinks(innerContent)}</strong>);
        } else {
          boldParts.push(<strong key={keyCounter++} style={{ color: '#0f172a' }}>{innerContent}</strong>);
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) boldParts.push(text.slice(lastIndex));
      
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={i} style={{ borderLeft: '4px solid #2563eb', padding: '16px 20px', marginBottom: 20, background: '#f8fafc', borderRadius: '0 12px 12px 0' }}>
            <p style={{ color: '#475569', fontStyle: 'italic', margin: 0 }}>
              {boldParts.length > 0 ? boldParts : trimmed.slice(2)}
            </p>
          </blockquote>
        );
      }
      
      if (trimmed === '---') {
        return <hr key={i} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0' }} />;
      }
      
      if (trimmed) {
        // Parse any remaining markdown links in the text
        const parseLinksInText = (content: string | React.ReactNode[]): React.ReactNode => {
          if (Array.isArray(content)) {
            return content.map((part, idx) => 
              typeof part === 'string' ? parseLinksInText(part) : part
            );
          }
          if (typeof content !== 'string') return content;
          
          const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          const parts: React.ReactNode[] = [];
          let linkLastIndex = 0;
          let linkMatch;
          let linkKey = 0;
          
          while ((linkMatch = linkRegex.exec(content)) !== null) {
            if (linkMatch.index > linkLastIndex) {
              parts.push(content.slice(linkLastIndex, linkMatch.index));
            }
            parts.push(
              <Link key={linkKey++} href={linkMatch[2]} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                {linkMatch[1]}
              </Link>
            );
            linkLastIndex = linkMatch.index + linkMatch[0].length;
          }
          if (linkLastIndex < content.length) {
            parts.push(content.slice(linkLastIndex));
          }
          return parts.length > 0 ? parts : content;
        };
        
        return (
          <p key={i} style={{ marginBottom: 16, color: '#475569', lineHeight: 1.8, fontSize: 16 }}>
            {boldParts.length > 0 ? parseLinksInText(boldParts) : parseLinksInText(trimmed)}
          </p>
        );
      }
      
      return null;
    });
}

// SEO Variations Block
function SEOVariations() {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        More Ways to Sign PDFs
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            <Link href="/blog/sign-pdf-on-iphone-free" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign PDF on iPhone
            </Link>
          </h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            Sign PDF documents directly on your iPhone without installing apps. Works in Safari and Chrome.{' '}
            <Link href="/blog/sign-pdf-on-iphone-free" style={{ color: '#2563eb' }}>Learn more →</Link>
          </p>
        </div>
        
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            <Link href="/blog/sign-pdf-without-adobe" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign PDF Without Adobe
            </Link>
          </h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            Skip the expensive Adobe Acrobat subscription. Our free online tool provides the same capabilities.{' '}
            <Link href="/blog/sign-pdf-without-adobe" style={{ color: '#2563eb' }}>Learn more →</Link>
          </p>
        </div>
        
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
            <Link href="/blog/sign-pdf-free-without-registration" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign PDF Without Registration
            </Link>
          </h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
            No email required. No account creation. Just upload your PDF and sign instantly.{' '}
            <Link href="/blog/sign-pdf-free-without-registration" style={{ color: '#2563eb' }}>Learn more →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    { question: 'Is it free?', answer: 'Yes! You can sign up to 2 PDF documents per day completely free. No credit card required, no hidden fees. Need more? Premium plans start at $9/month for unlimited signing.' },
    { question: 'Is it legal to sign PDF online?', answer: 'Absolutely. Electronic signatures are legally binding in the US (ESIGN Act, UETA), EU (eIDAS), UK, Canada, Australia, and 100+ countries worldwide. Our signed documents meet all legal requirements.' },
    { question: 'Do I need to install anything?', answer: 'No installation required. Our PDF signer works entirely in your web browser — Chrome, Safari, Firefox, Edge. Simply open the website, upload your PDF, and start signing instantly.' },
    { question: 'Is my document secure?', answer: 'Yes, your documents are 100% secure. All PDF processing happens locally in your browser. Your files are never uploaded to our servers, and we collect zero personal data.' },
  ];

  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        FAQ
      </h2>
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '0 24px' }}>
        {faqs.map((faq, index) => <FAQItem key={index} question={faq.question} answer={faq.answer} />)}
      </div>
    </div>
  );
}

// Final CTA Block
function FinalCTA({ tool }: { tool: ArticleTool }) {
  const meta = TOOL_META[tool];
  return (
    <div style={{ marginTop: 48, padding: 40, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 24, textAlign: 'center', boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)' }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 12, letterSpacing: -0.5 }}>
        {meta.finalTitle}
      </h2>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 28 }}>
        {meta.finalSub}
      </p>
      <Link href={meta.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 36px', background: 'white', color: '#2563eb', fontWeight: 800, fontSize: 16, borderRadius: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        {meta.ctaShort}
      </Link>
    </div>
  );
}

// Related Articles
function RelatedArticles({ currentSlug, allPosts }: { currentSlug: string; allPosts: BlogPost[] }) {
  const relatedPosts = allPosts.filter(p => p.slug !== currentSlug).slice(0, 6);

  return (
    <div style={{ marginTop: 48 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        Related Articles
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {relatedPosts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{post.readTime}</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginTop: 8, lineHeight: 1.4 }}>
                {post.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface BlogPostContentProps {
  post: BlogPost;
  allPosts: BlogPost[];
}

export default function BlogPostContent({ post, allPosts }: BlogPostContentProps) {
  const tool = getArticleTool(post.slug);
  const meta = TOOL_META[tool];
  // If the article content has its own [QuickSummary] marker, let the
  // inline parser render it where the author placed it. Otherwise,
  // fall back to the generic default above the body.
  const hasInlineQuickSummary = /\[QuickSummary\]/.test(post.content);

  return (
    <>
      <NavHeader />

      {/* Breadcrumb */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>Blog</Link>
            <span>/</span>
            <span style={{ color: '#334155' }}>{post.title}</span>
          </nav>
        </div>
      </div>

      {/* Article */}
      <article className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span style={{ padding: '6px 14px', background: '#eff6ff', color: '#2563eb', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              {post.readTime}
            </span>
            <time dateTime={post.date} style={{ fontSize: 14, color: '#64748b' }}>
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
            <span style={{ fontSize: 14, color: '#64748b' }}>by {post.author}</span>
          </div>

          {/* H1 Title - SEO Optimized */}
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 24, lineHeight: 1.2, letterSpacing: -0.5 }}>
            {post.title}
          </h1>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ padding: '6px 12px', background: '#f8fafc', color: '#64748b', borderRadius: 20, fontSize: 13 }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* HERO: PDF Uploader */}
          <div style={{ marginBottom: 48, padding: 40, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 24, boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)' }}>
            <BlogPdfUploader tool={tool} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 20, textAlign: 'center' }}>
              {meta.heroSub}
            </p>
          </div>

          {/* Quick Summary — only if article doesn't render its own [QuickSummary] */}
          {!hasInlineQuickSummary && <DefaultQuickSummary />}

          {/* Content */}
          <div style={{ fontSize: 16 }}>
            {formatContent(post.content, tool)}
          </div>

          {/* SEO Variations */}
          <SEOVariations />

          {/* FAQ Accordion */}
          <FAQSection />

          {/* Final CTA */}
          <FinalCTA tool={tool} />

          {/* Related Articles */}
          <RelatedArticles currentSlug={post.slug} allPosts={allPosts} />
        </div>
      </article>

      {/* Sticky Mobile CTA */}
      <StickyCTA tool={tool} />

      <SiteFooter />
    </>
  );
}
