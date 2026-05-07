import type { Metadata } from 'next';
import { Download, FileText, Send, Signature, TextCursorInput } from 'lucide-react';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import NdaHeroCard from './NdaHeroCard';

export const metadata: Metadata = {
  title: 'Free Mutual NDA Template — Sign Online or Download',
  description:
    'Free mutual non-disclosure agreement template. Fill and sign online in your browser, or download as PDF or Word. No registration.',
  alternates: { canonical: '/sign-nda' },
  openGraph: {
    title: 'Free Mutual NDA Template — Sign Online or Download',
    description:
      'Free mutual non-disclosure agreement template. Fill and sign online in your browser, or download as PDF or Word.',
    url: '/sign-nda',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Mutual NDA Template — Sign Online or Download',
    description: 'Free mutual NDA template. Fill and sign online or download as PDF/Word.',
  },
};

// 5-step visual workflow rendered between the hero card and the
// "About NDAs" tool description. /sign-nda only — other tool pages
// keep their own onboarding patterns.
//
// Icons + colors are deliberately distinct per step: step 2 (Fill)
// uses a typing cursor and step 3 (Sign) uses a signature line so the
// two pencil-shaped icons (Edit3 / PenLine) don't read as duplicates.
// Each step pairs a foreground colour with a 8% tint background plate
// so the row reads as a series of differentiated chips rather than a
// uniform blue strip.
const FLOW_STEPS = [
  { Icon: FileText,         title: 'Pick template', fg: '#3B82F6', bg: '#EFF6FF' },
  { Icon: TextCursorInput,  title: 'Fill fields',   fg: '#10B981', bg: '#ECFDF5' },
  { Icon: Signature,        title: 'Sign',          fg: '#8B5CF6', bg: '#F5F3FF' },
  { Icon: Download,         title: 'Download',      fg: '#F59E0B', bg: '#FFFBEB' },
  { Icon: Send,             title: 'Send',          fg: '#06B6D4', bg: '#ECFEFF' },
] as const;

// "About NDAs" section content. Rendered inline below using the shared
// `.tool-description-*` classes plus an extra `.tool-description-h3`
// rule so each idea gets its own subheading. Kept inline (not pushed
// into the shared <ToolDescription> component) so the simple
// title+paragraphs API of that component stays unchanged for the
// other tool pages.
const ABOUT_SECTIONS: { h3: string; paragraphs: string[] }[] = [
  {
    h3: 'When to use a mutual NDA',
    paragraphs: [
      "A non-disclosure agreement protects information shared between two parties during business discussions — when you're talking to a potential investor, partner, contractor, or new hire about anything sensitive.",
    ],
  },
  {
    h3: 'Mutual vs one-way',
    paragraphs: [
      "This template is mutual, meaning both parties agree to protect each other's confidential information. If only one side is sharing — for example, when hiring a contractor who needs access to your data — a one-way NDA is more common, but mutual NDAs work too and are often the simpler choice.",
    ],
  },
  {
    h3: 'Is it legally binding?',
    paragraphs: [
      'Electronic signatures on NDAs are legally binding in the US, EU, UK, and most jurisdictions. ESIGN Act, UETA, and eIDAS all recognize signed PDFs as valid contracts.',
      'This template is provided for informational purposes only and does not constitute legal advice. For complex situations, consult a licensed attorney.',
    ],
  },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is this NDA template free to use?',
    a: 'Yes. Download the PDF or Word version, or fill and sign online — all free, no registration.',
  },
  {
    q: 'Mutual NDA or one-way NDA — which do I need?',
    a: 'Mutual NDA protects both parties when both are sharing information. One-way NDA protects only the disclosing party. When in doubt, mutual works for most situations and is what investors, partners, and freelancers typically expect.',
  },
  {
    q: 'Is an electronically signed NDA legally binding?',
    a: 'In the US, EU, UK, and most jurisdictions — yes, for everyday business documents. Both parties need to consent to electronic signing, and the signed document needs to be tamper-evident, both of which are handled automatically here.',
  },
  {
    q: 'Can I edit the template before signing?',
    a: "Yes. Download the Word version to edit clauses, change the term, or adjust governing law. Save as PDF when you're done, then come back to sign it.",
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://www.signmypdf.io/sign-nda#webpage',
      url: 'https://www.signmypdf.io/sign-nda',
      name: 'Free Mutual NDA Template — Sign Online or Download',
      description:
        'Free mutual non-disclosure agreement template. Fill and sign online in your browser, or download as PDF or Word.',
      inLanguage: 'en-US',
      isPartOf: {
        '@type': 'WebSite',
        name: 'SignMyPDF',
        url: 'https://www.signmypdf.io',
      },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: 'https://www.signmypdf.io/opengraph-image',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://www.signmypdf.io/sign-nda#faq',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    },
  ],
};

export default function SignNdaPage() {
  return (
    <>
      <NavHeader activeTool="sign" />

      <main>
        <section className="nda-hero">
          <div className="nda-hero-inner">
            <h1>Free Mutual NDA Template — Sign Online or Download</h1>
            <p className="nda-hero-sub">
              A simple two-party non-disclosure agreement. Fill it out and sign online in your
              browser, or download as PDF or Word.
            </p>
            <NdaHeroCard />
          </div>
        </section>

        <section className="nda-flow" aria-label="How it works">
          <h2 className="nda-flow-heading">How it works</h2>
          <ol className="nda-flow-card">
            {FLOW_STEPS.map((s) => (
              <li key={s.title} className="nda-flow-step">
                <div
                  className="nda-flow-icon"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <s.Icon size={28} strokeWidth={1.8} />
                </div>
                <h3 className="nda-flow-title">{s.title}</h3>
              </li>
            ))}
          </ol>
        </section>

        <section className="tool-description">
          <div className="tool-description-card">
            <h2 className="tool-description-title">About NDAs</h2>
            {ABOUT_SECTIONS.map((sec) => (
              <div key={sec.h3}>
                <h3 className="tool-description-h3">{sec.h3}</h3>
                {sec.paragraphs.map((p, i) => (
                  <p key={i} className="tool-description-text">{p}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="container nda-faq-wrap" style={{ paddingBottom: 40 }}>
          <div className="compact-faq">
            <h2>FAQ</h2>
            {FAQ_ITEMS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p className="faq-answer">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
