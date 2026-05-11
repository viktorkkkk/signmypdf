import type { Metadata } from 'next';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import ChromeLandingClient from './ChromeLandingClient';

export const metadata: Metadata = {
  title: 'Sign PDF in Chrome — Free Extension, No Signup | SignMyPDF',
  description:
    'Free Chrome extension to sign PDF files in your browser. No signup, no watermark. Drag, drop, sign, download. Works with Gmail, Drive, and any website.',
  alternates: { canonical: '/chrome' },
  openGraph: {
    title: 'Sign PDF in Chrome — Free Chrome Extension',
    description: 'Sign any PDF in your browser. Free, no signup needed.',
    url: '/chrome',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign PDF in Chrome — Free Chrome Extension',
    description: 'Sign any PDF in your browser. Free, no signup needed.',
  },
};

// URL we point the primary CTA at. Until the extension is approved
// in the Chrome Web Store and we have a real ID, the button falls
// through to `/sign` so the page is useful out of the gate. PR
// reviewer can swap this in once the listing is live.
const CHROME_STORE_URL = 'https://chrome.google.com/webstore/detail/sign-pdf-free-signmypdf';

const HOW_IT_WORKS = [
  {
    n: 1,
    title: 'Install extension',
    body: 'Add the free extension from the Chrome Web Store. No signup, no permissions beyond signmypdf.io.',
  },
  {
    n: 2,
    title: 'Drop your PDF',
    body: 'Click the toolbar icon and drop a PDF, or right-click any PDF link on the web → Sign with SignMyPDF.',
  },
  {
    n: 3,
    title: 'Sign and download',
    body: 'The file opens in our editor pre-loaded. Draw or type your signature, place it anywhere, download.',
  },
];

const FEATURES = [
  { title: 'Sign PDFs without leaving your browser', body: 'No desktop app, no second tab, no upload step.' },
  { title: 'No signup required', body: 'Two free PDFs per day with no account, no email, no card.' },
  { title: 'No watermark on free plan', body: 'Up to 2 signed PDFs per day are watermark-free, forever.' },
  { title: 'Works with Gmail, Drive, any site', body: 'Right-click any PDF link and send it straight to the editor.' },
  { title: 'Files never leave your browser (free plan)', body: 'PDF processing runs locally — signmypdf.io never sees the bytes.' },
  { title: 'Saved signatures sync across devices (Pro)', body: 'Sign in once, your saved signatures are everywhere.' },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is it really free?',
    a: 'Yes. Two PDFs per day are free forever, no signup needed. No watermark on those two. After that, Pro removes the limit for $9/month.',
  },
  {
    q: 'Do my files leave my browser?',
    a: "On the free plan — no. Everything happens locally on the page. On Pro, files are encrypted and stored in the cloud only if you opt in for cross-device access.",
  },
  {
    q: 'Is the signature legally binding?',
    a: 'Electronic signatures are recognized under the ESIGN Act (US) and eIDAS (EU). However, this is not legal advice — for critical documents consult a lawyer.',
  },
  {
    q: 'Can I use it without installing the extension?',
    a: 'Yes — go to signmypdf.io/sign and use it directly in any browser. The extension just makes the drop-to-editor flow one click shorter.',
  },
  {
    q: 'What if I need more than 2 PDFs per day?',
    a: 'Upgrade to Pro for unlimited PDFs across all tools (sign, fill, protect, compress, merge, split) for $9/month, or $7.50/month billed annually.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://www.signmypdf.io/chrome#webpage',
      url: 'https://www.signmypdf.io/chrome',
      name: 'Sign PDF in Chrome — Free Extension',
      description:
        'Free Chrome extension to sign PDF files in your browser. No signup, no watermark.',
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Sign PDF Free — SignMyPDF',
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Chrome',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      url: 'https://www.signmypdf.io/chrome',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default function ChromeLandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavHeader />

      <main className="chrome-landing">
        <ChromeLandingClient
          chromeStoreUrl={CHROME_STORE_URL}
          howItWorks={HOW_IT_WORKS}
          features={FEATURES}
          faq={FAQ}
        />
      </main>

      <SiteFooter />
    </>
  );
}
