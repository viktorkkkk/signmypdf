'use client';

import { useState, useEffect, isValidElement } from 'react';
import Link from 'next/link';
import {
  PenLine,
  Lock,
  FileText,
  MapPin,
  Download,
  Link2,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardList,
  CheckSquare,
  Folder,
  Briefcase,
  Globe,
  Hospital,
  Wrench,
  Shield,
  KeyRound,
  FileSignature,
  type LucideIcon,
} from 'lucide-react';
import { BlogPost } from '../posts';
import NavHeader from '../../components/NavHeader';
import SiteFooter from '../../components/SiteFooter';
import BlogPdfUploader from '../../components/BlogPdfUploader';
import ChromeExtensionBanner from '../../components/ChromeExtensionBanner';
import {
  QuickAnswer,
  Toc,
  SectionLabel,
  StepHead,
  PhoneShot,
  ShotGrid,
  Callout,
  CompareTable,
  FaqAccordion,
  RelatedGrid,
  CtaCard,
  type CompareCell,
  type FaqItem,
  type RelatedItem,
} from '../components/ArticleBlocks';
import { extractToc, stripAnchor } from '../guide-parse';

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
  // Persona / use-case slugs whose name doesn't match the fill-* heuristic
  'property-managers-tenant-signatures',
  'law-firms-free-pdf-tools',
  // Comparison slugs whose name doesn't start with fill-
  'dochub-free-alternative',
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
  // New — slugs that don't match the heuristic patterns above
  'protect-business-proposal-pdf',
  'protect-invoice-pdf-online',
  'protect-tax-return-pdf',
  'protect-confidential-business-reports-pdf',
  'stop-pdf-from-being-forwarded',
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
  heroSub: string;
  defaultCtaTitle: string;
  defaultCtaBtn: string;
}> = {
  sign: {
    href: '/sign',
    ctaLong: 'Sign PDF Now — Free',
    ctaShort: 'Sign PDF Now – Free',
    heroSub: 'Sign your PDF in seconds — no registration, no downloads',
    defaultCtaTitle: 'Ready to Sign Your PDF?',
    defaultCtaBtn: 'Sign PDF Free Now',
  },
  fill: {
    href: '/fill',
    ctaLong: 'Fill PDF Now — Free',
    ctaShort: 'Fill PDF Now – Free',
    heroSub: 'Fill your PDF in seconds — no registration, no downloads',
    defaultCtaTitle: 'Ready to Fill Your PDF?',
    defaultCtaBtn: 'Fill PDF Free Now',
  },
  protect: {
    href: '/protect',
    ctaLong: 'Protect PDF Now — Free',
    ctaShort: 'Protect PDF Now – Free',
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

// ─── Render-layer emoji → lucide SVG replacement ────────────────────────────
// Frozen blog content (date <= 2026-04-27) was authored under the old prompt
// which embedded pictographic emoji (🔒 in [CALLOUT]s, ✅/❌ in comparison
// tables, etc.). Per Hard Rule 1 we cannot edit posts.ts source for those
// articles. Instead we intercept the emoji at render time and emit lucide
// SVG components — same UX as the rest of the site.
//
// Dingbat-class symbols (✓ U+2713, ✗ U+2717) are skipped on purpose: they
// render as text-mode glyphs identically across OS, and stripping them out
// would break flow inside table cells like "✓ Yes".
type EmojiMeta = { Icon: LucideIcon; color?: string; size?: number; fill?: string };
const EMOJI_TO_ICON: Record<string, EmojiMeta> = {
  '\u{2705}':         { Icon: CheckCircle,    color: '#16a34a', size: 20 }, // ✅ green
  '\u{274C}':         { Icon: XCircle,        color: '#dc2626', size: 20 }, // ❌ red
  '\u{1F512}':        { Icon: Lock,           size: 17 },                   // 🔒
  '\u{26A0}\u{FE0F}': { Icon: AlertTriangle,  color: '#f59e0b', size: 17 }, // ⚠️
  '\u{1F4CB}':        { Icon: ClipboardList,  size: 17 },                   // 📋
  '\u{2611}':         { Icon: CheckSquare,    color: '#16a34a', size: 17 }, // ☑
  '\u{2611}\u{FE0F}': { Icon: CheckSquare,    color: '#16a34a', size: 17 }, // ☑️
  '\u{1F4C1}':        { Icon: Folder,         size: 17 },                   // 📁
  '\u{1F4BC}':        { Icon: Briefcase,      size: 17 },                   // 💼
  '\u{1F30D}':        { Icon: Globe,          size: 17 },                   // 🌍
  '\u{1F3E5}':        { Icon: Hospital,       size: 17 },                   // 🏥
  '\u{1F527}':        { Icon: Wrench,         size: 17 },                   // 🔧
  '\u{1F6E1}\u{FE0F}': { Icon: Shield,        size: 17 },                   // 🛡️
  '\u{1F510}':        { Icon: KeyRound,       size: 17 },                   // 🔐
  '\u{1F4DD}':        { Icon: FileSignature,  size: 17 },                   // 📝
};
const EMOJI_REGEX = /\u{2705}|\u{274C}|\u{1F512}|\u{26A0}\u{FE0F}?|\u{1F4CB}|\u{2611}\u{FE0F}?|\u{1F4C1}|\u{1F4BC}|\u{1F30D}|\u{1F3E5}|\u{1F527}|\u{1F6E1}\u{FE0F}?|\u{1F510}|\u{1F4DD}/gu;

function renderEmojiInText(text: string, keyPrefix = 'e'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  EMOJI_REGEX.lastIndex = 0;
  while ((m = EMOJI_REGEX.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const raw = m[0];
    const meta = EMOJI_TO_ICON[raw] ?? EMOJI_TO_ICON[raw + '\uFE0F'] ?? EMOJI_TO_ICON[raw.replace(/\uFE0F$/, '')];
    if (meta) {
      const { Icon, color, size = 17, fill } = meta;
      out.push(
        <Icon
          key={`${keyPrefix}-${k++}`}
          size={size}
          color={color}
          {...(fill ? { fill } : {})}
          aria-hidden="true"
          style={{ display: 'inline-block', verticalAlign: '-3px', flexShrink: 0 }}
        />
      );
    } else {
      out.push(raw);
    }
    last = m.index + raw.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Render inline bold/links within a string. Plain-text segments additionally
// pass through renderEmojiInText so frozen articles' emoji become SVG icons.
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...renderEmojiInText(text.slice(last, match.index), `t${key}`));
    }
    if (match[0].startsWith('**')) {
      parts.push(
        <strong key={`b${key++}`} style={{ color: '#0f172a' }}>
          {renderEmojiInText(match[0].slice(2, -2), `b${key}`)}
        </strong>
      );
    } else {
      parts.push(
        <a key={`a${key++}`} href={match[3]} style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
          {renderEmojiInText(match[2], `a${key}`)}
        </a>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(...renderEmojiInText(text.slice(last), `tend`));
  return parts;
}

// Parse content
function formatContent(content: string, tool: ArticleTool = 'sign') {
  const meta = TOOL_META[tool];
  return content
    .split('\n\n')
    .map((block, i) => {
      const trimmed = block.trim();

      // Skip [QuickSummary] blocks entirely — the templated 4-field plate
      // (Time / Cost / Works on / Registration) is removed across the blog.
      // posts.ts is not edited (Hard Rule 1); we just drop the marker at
      // render time so the 51 frozen articles also lose the block visually.
      if (trimmed.startsWith('[QuickSummary]')) {
        return null;
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
            <p style={{ margin: 0, fontSize: 15, color: '#1e40af', lineHeight: 1.7, fontWeight: 500 }}>{renderInline(text)}</p>
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

        // Walk the resolved nodes and run any leaf strings through the
        // emoji → SVG replacement so frozen-content emoji in plain
        // paragraphs (e.g. "🔐 Protect PDF" inside running prose) become
        // lucide icons.
        const replaceLeafEmoji = (node: React.ReactNode): React.ReactNode => {
          if (Array.isArray(node)) {
            return node.flatMap((n, idx) => {
              const r = replaceLeafEmoji(n);
              return Array.isArray(r) ? r : [r];
            });
          }
          if (typeof node === 'string') return renderEmojiInText(node, `pp`);
          return node;
        };

        return (
          <p key={i} style={{ marginBottom: 16, color: '#475569', lineHeight: 1.8, fontSize: 16 }}>
            {replaceLeafEmoji(boldParts.length > 0 ? parseLinksInText(boldParts) : parseLinksInText(trimmed))}
          </p>
        );
      }
      
      return null;
    });
}

// ─── Long-form guide layout ─────────────────────────────────────────────────
// Opt-in per article via `layout: 'guide'` in posts.ts. The legacy renderer
// above is deliberately untouched, so articles that don't set the flag render
// exactly as before. Markers are documented in app/blog/components/ArticleBlocks.tsx.

type GuidePiece = { kind: 'break' } | { kind: 'node'; node: React.ReactNode };

const SHOT_RE = /^\[SHOT\s+([^|\]]+?)\s*\|\s*([^|\]]+?)\s*(?:\|\s*([^|\]]+?)\s*)?(?:\|\s*(\d+)x(\d+)\s*)?\]$/;
const REL_RE = /^\[([^|\]]+?)\s*\|\s*([^|\]]+?)\s*(?:\|\s*([^\]]+?)\s*)?\]$/;

function parseTableRow(row: string): string[] {
  return row.split('|').slice(1, -1).map((c) => c.trim());
}

/** `[+]None` / `[-]50 MB` → coloured yes/no cell. */
function parseCompareCell(raw: string): CompareCell {
  if (raw.startsWith('[+]')) return { text: renderInline(raw.slice(3).trim()), tone: 'yes' };
  if (raw.startsWith('[-]')) return { text: renderInline(raw.slice(3).trim()), tone: 'no' };
  return { text: renderInline(raw) };
}

function renderShot(line: string, key: string, priority: boolean): React.ReactNode | null {
  const m = line.trim().match(SHOT_RE);
  if (!m) return null;
  return (
    <PhoneShot
      key={key}
      src={m[1].trim()}
      alt={m[2].trim()}
      caption={m[3]?.trim()}
      width={m[4] ? parseInt(m[4], 10) : 640}
      height={m[5] ? parseInt(m[5], 10) : 1387}
      priority={priority}
    />
  );
}

/**
 * Render the plain blocks of a guide (everything outside the paired
 * [QUICKANSWER] / [SHOTS] / [FAQ] / [RELATED] / [CALLOUT:x] regions).
 * `state` carries the running shot counter so only the first screenshot
 * on the page is eager-loaded (it is the LCP candidate).
 */
function renderGuideBlocks(
  text: string,
  tool: ArticleTool,
  toc: { id: string; label: string }[],
  state: { shots: number },
  keyBase: string
): GuidePiece[] {
  const meta = TOOL_META[tool];
  const out: GuidePiece[] = [];

  text.split('\n\n').forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = `${keyBase}-${i}`;

    // Table of contents — rendered in the main column, never the sidebar.
    if (trimmed === '[TOC]') {
      out.push({ kind: 'node', node: <Toc key={key} items={toc} /> });
      return;
    }

    // Inline upload widget. Its position in the article is deliberate:
    // it sits after the first method, not above the opening paragraph.
    if (trimmed === '[WIDGET]') {
      out.push({
        kind: 'node',
        node: (
          <div key={key} className="ba-widget">
            <div style={{ padding: 28, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 18, boxShadow: '0 16px 44px rgba(37, 99, 235, 0.24)' }}>
              <BlogPdfUploader tool={tool} />
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 16, textAlign: 'center' }}>
                {meta.heroSub}
              </p>
            </div>
          </div>
        ),
      });
      return;
    }

    // Section kicker — also starts a new card.
    if (trimmed.startsWith('[LABEL]')) {
      out.push({ kind: 'break' });
      out.push({ kind: 'node', node: <SectionLabel key={key}>{trimmed.slice(7).trim()}</SectionLabel> });
      return;
    }

    // Numbered step head: `[STEP 1] Title`
    const stepMatch = trimmed.match(/^\[STEP\s+(\d+)\]\s*([^\n]+)$/);
    if (stepMatch) {
      out.push({
        kind: 'node',
        node: <StepHead key={key} n={parseInt(stepMatch[1], 10)} title={renderInline(stepMatch[2].trim())} />,
      });
      return;
    }

    // Single screenshot.
    if (trimmed.startsWith('[SHOT ')) {
      const shot = renderShot(trimmed, `${key}-s`, state.shots === 0);
      if (shot) {
        state.shots += 1;
        out.push({ kind: 'node', node: <ShotGrid key={key}>{shot}</ShotGrid> });
        return;
      }
    }

    // Comparison table.
    if (trimmed.startsWith('[COMPARE]')) {
      const rows = trimmed.split('\n').map((r) => r.trim()).filter((r) => r.startsWith('|'));
      const headers = parseTableRow(rows[0] || '').map((h) => renderInline(h));
      const body = rows
        .slice(1)
        .filter((r) => !/^\|[-| :]+\|$/.test(r))
        .map((r) => {
          const cells = parseTableRow(r);
          return { head: renderInline(cells[0]), cells: cells.slice(1).map(parseCompareCell) };
        });
      out.push({ kind: 'node', node: <CompareTable key={key} headers={headers} rows={body} /> });
      return;
    }

    // Closing CTA card — its own section.
    if (trimmed.startsWith('[CTA]')) {
      const parts = trimmed.slice(5).split('|');
      out.push({ kind: 'break' });
      out.push({
        kind: 'node',
        node: (
          <CtaCard
            key={key}
            title={parts[0]?.trim() || meta.defaultCtaTitle}
            sub={parts[1]?.trim() || undefined}
            href={meta.href}
            button={parts[2]?.trim() || meta.defaultCtaBtn}
          />
        ),
      });
      return;
    }

    // Headings. `## ` starts a new card; `{#anchor}` becomes the id.
    if (trimmed.startsWith('## ')) {
      const { text: headText, id } = stripAnchor(trimmed.slice(3).trim());
      // A kicker directly above the heading belongs to the same card.
      const prev = out[out.length - 1];
      const afterLabel = prev?.kind === 'node' && isValidElement(prev.node) && prev.node.type === SectionLabel;
      if (!afterLabel) out.push({ kind: 'break' });
      out.push({ kind: 'node', node: <h2 key={key} id={id}>{renderInline(headText)}</h2> });
      return;
    }
    if (trimmed.startsWith('### ')) {
      const { text: headText, id } = stripAnchor(trimmed.slice(4).trim());
      out.push({ kind: 'node', node: <h3 key={key} id={id}>{renderInline(headText)}</h3> });
      return;
    }

    if (trimmed.startsWith('- ')) {
      const items = trimmed.split('\n').filter((l) => l.trim().startsWith('- '));
      out.push({
        kind: 'node',
        node: <ul key={key}>{items.map((it, j) => <li key={j}>{renderInline(it.trim().slice(2))}</li>)}</ul>,
      });
      return;
    }

    if (/^\d+\./.test(trimmed)) {
      const items = trimmed.split('\n').filter((l) => /^\d+\./.test(l.trim()));
      out.push({
        kind: 'node',
        node: <ol key={key}>{items.map((it, j) => <li key={j}>{renderInline(it.trim().replace(/^\d+\.\s*/, ''))}</li>)}</ol>,
      });
      return;
    }

    out.push({ kind: 'node', node: <p key={key}>{renderInline(trimmed)}</p> });
  });

  return out;
}

const PAIRED_RE = /\[(QUICKANSWER|SHOTS|FAQ|RELATED)\]([\s\S]*?)\[\/\1\]|\[CALLOUT:(\w+)\]([\s\S]*?)\[\/CALLOUT\]/g;

/**
 * Parse a whole guide article into `.ba-card` sections. `head` (the H1 and
 * the meta line) is prepended to the first card so the title, the quick
 * answer and the TOC share one plate, as in the reference layout.
 */
function renderGuide(
  content: string,
  tool: ArticleTool,
  toc: { id: string; label: string }[],
  head: React.ReactNode
): React.ReactNode[] {
  const pieces: GuidePiece[] = [];
  const state = { shots: 0 };
  let cursor = 0;
  let n = 0;

  PAIRED_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAIRED_RE.exec(content)) !== null) {
    if (m.index > cursor) {
      pieces.push(...renderGuideBlocks(content.slice(cursor, m.index), tool, toc, state, `g${n++}`));
    }
    const key = `p${n++}`;
    const kind = m[1];
    const body = (m[2] ?? m[4] ?? '').trim();

    if (kind === 'QUICKANSWER') {
      pieces.push({
        kind: 'node',
        node: (
          <QuickAnswer key={key}>
            {body.split(/\n\s*\n/).map((p, j) => <p key={j}>{renderInline(p.trim())}</p>)}
          </QuickAnswer>
        ),
      });
    } else if (kind === 'SHOTS') {
      const shots = body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('[SHOT '))
        .map((l, j) => {
          const node = renderShot(l, `${key}-${j}`, state.shots === 0);
          if (node) state.shots += 1;
          return node;
        })
        .filter(Boolean);
      pieces.push({ kind: 'node', node: <ShotGrid key={key} two={shots.length > 1}>{shots}</ShotGrid> });
    } else if (kind === 'FAQ') {
      const items: FaqItem[] = [];
      for (const chunk of body.split(/\n\s*\n/)) {
        const lines = chunk.trim().split('\n');
        const q = lines[0]?.trim().match(/^\*\*(.+)\*\*$/);
        if (!q || lines.length < 2) continue;
        items.push({ q: q[1].trim(), a: renderInline(lines.slice(1).join(' ').trim()) });
      }
      pieces.push({ kind: 'node', node: <FaqAccordion key={key} items={items} /> });
    } else if (kind === 'RELATED') {
      const items: RelatedItem[] = [];
      for (const line of body.split('\n')) {
        const r = line.trim().match(REL_RE);
        if (r) items.push({ title: r[1].trim(), href: r[2].trim(), desc: r[3]?.trim() });
      }
      pieces.push({ kind: 'node', node: <RelatedGrid key={key} items={items} /> });
    } else {
      // [CALLOUT:variant] — first line is the title, the rest is the body.
      const lines = body.split('\n');
      const { text: titleText, id } = stripAnchor(lines[0].trim());
      const rest = lines.slice(1).join('\n').trim();
      pieces.push({
        kind: 'node',
        node: (
          <div key={key} id={id}>
            <Callout variant="warning" title={renderInline(titleText)}>
              {renderGuideBlocks(rest, tool, toc, state, `${key}-b`)
                .filter((p): p is { kind: 'node'; node: React.ReactNode } => p.kind === 'node')
                .map((p) => p.node)}
            </Callout>
          </div>
        ),
      });
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < content.length) {
    pieces.push(...renderGuideBlocks(content.slice(cursor), tool, toc, state, `g${n++}`));
  }

  // Group into cards: every `break` closes the current card.
  const cards: React.ReactNode[][] = [[head]];
  for (const p of pieces) {
    if (p.kind === 'break') {
      if (cards[cards.length - 1].length > 0) cards.push([]);
    } else {
      cards[cards.length - 1].push(p.node);
    }
  }

  return cards
    .filter((c) => c.length > 0)
    .map((c, i) => {
      // The CTA card renders its own `.ba-card` wrapper.
      if (c.length === 1 && isValidElement(c[0]) && c[0].type === CtaCard) return c[0];
      return <section key={`card-${i}`} className="ba-card">{c}</section>;
    });
}

function GuideArticle({ post, tool }: { post: BlogPost; tool: ArticleTool }) {
  const toc = extractToc(post.content);
  // The visible date is the last-updated one — a 2026-04 publication date on
  // a guide that was rewritten today reads as stale in the SERP.
  const displayDate = post.modified || post.date;

  const head = (
    <div key="head">
      <h1 className="ba-h1">{post.title}</h1>
      <p className="ba-meta">
        <span className="ba-updated">
          Updated{' '}
          {new Date(displayDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </span>
        <span className="ba-dot">·</span><span>{post.readTime}</span>
        <span className="ba-dot">·</span><span>{post.author}</span>
      </p>
    </div>
  );

  return (
    <>
      <NavHeader />

      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>Blog</Link>
            <span>/</span>
            <span style={{ color: '#334155' }}>{post.breadcrumb || post.title}</span>
          </nav>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="ba-cols">
          <main className="ba-main">
            {renderGuide(post.content, tool, toc, head)}
          </main>

          <aside className="ba-rail">
            <div className="ba-rail-inner">
              <div className="ba-card">
                <Toc items={toc} variant="rail" />
              </div>
              <div className="ba-card">
                <p className="ba-label">Sign it now</p>
                <p style={{ fontSize: 14.5, color: 'var(--color-ink-2)', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Free in your browser. No app, no account, no watermark.
                </p>
                <Link href={TOOL_META[tool].href} className="ba-btn ba-btn-block">Sign a PDF Free</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <StickyCTA tool={tool} />
      <SiteFooter />
    </>
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

  // Long-form guides own their whole layout (TOC, mid-article widget,
  // sidebar rail). Everything else keeps the original template.
  if (post.layout === 'guide') {
    return <GuideArticle post={post} tool={tool} />;
  }

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
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 40, lineHeight: 1.2, letterSpacing: -0.5 }}>
            {post.title}
          </h1>

          {/* HERO: PDF Uploader */}
          <div style={{ marginBottom: 48, padding: 40, background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', borderRadius: 24, boxShadow: '0 20px 60px rgba(37, 99, 235, 0.3)' }}>
            <BlogPdfUploader tool={tool} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 20, textAlign: 'center' }}>
              {meta.heroSub}
            </p>
          </div>

          {/* Content */}
          <div style={{ fontSize: 16 }}>
            {formatContent(post.content, tool)}
          </div>

          {/* End-of-article Chrome-extension CTA. Sign + Fill only —
              not relevant on Protect/Merge/Compress/Split topics. */}
          {tool !== 'protect' && <ChromeExtensionBanner />}

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
