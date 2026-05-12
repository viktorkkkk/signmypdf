import type { Metadata } from 'next';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import ChromeLandingClient from './ChromeLandingClient';

export const metadata: Metadata = {
  // Root layout already appends " | SignMyPDF" — keep this title
  // bare so we don't end up with "X | SignMyPDF | SignMyPDF" in the
  // SERP / browser tab.
  title: 'Sign PDF in your browser, free Chrome extension',
  description:
    'Free Chrome extension to sign PDF files in your browser. No signup, no watermark. Drag, drop, sign, download. Works with Gmail, Drive, and any website.',
  alternates: { canonical: '/chrome' },
  openGraph: {
    title: 'Sign PDF in your browser, free Chrome extension',
    description: 'Sign any PDF in your browser. Free, no signup needed.',
    url: '/chrome',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign PDF in your browser, free Chrome extension',
    description: 'Sign any PDF in your browser. Free, no signup needed.',
  },
};

// Chrome Web Store URL — placeholder until the listing goes live.
// Reviewer swaps this for the real URL once we get the listing ID.
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/PLACEHOLDER';

const HOW_IT_WORKS = [
  {
    n: 1,
    title: 'Install the extension',
    body: 'One click from the Chrome Web Store. No signup, no permissions beyond signmypdf.io.',
  },
  {
    n: 2,
    title: 'Click the icon or right-click a PDF',
    body: 'Toolbar click opens a clean signing tab. Right-click any PDF link → Sign with SignMyPDF.',
  },
  {
    n: 3,
    title: 'Sign and download',
    body: 'Draw or type your signature, place it on any page, download the signed PDF in seconds.',
  },
];

const WHY_USE = [
  'Sign PDFs from Gmail in one click',
  'Right-click any PDF link → Sign',
  'No need to download files first',
  'Works on any website with PDFs',
];

// FAQ removed in Stage 5 PR 4 — page is now single-purpose.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://www.signmypdf.io/chrome#webpage',
      url: 'https://www.signmypdf.io/chrome',
      name: 'Sign PDF in your browser, free Chrome extension',
      description:
        'Free Chrome extension to sign PDF files in your browser. No signup, no watermark.',
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Sign PDF Free',
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Chrome',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      url: 'https://www.signmypdf.io/chrome',
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
          whyUse={WHY_USE}
        />
      </main>

      <SiteFooter />
    </>
  );
}
