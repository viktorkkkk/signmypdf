import type { Metadata } from 'next';

/**
 * Per-page metadata for the Chrome extension landing.
 *
 * The page sits at /sign-pdf-chrome-extension (keyword-rich slug) and
 * replaces the older /chrome route. Root layout appends ` | SignMyPDF`
 * automatically, so titles here stay bare.
 *
 * `metadataBase` from the root layout resolves the relative URLs below
 * to absolute https://www.signmypdf.io/... per the Canonical host
 * policy in apps/web/CLAUDE.md.
 */
export const metadata: Metadata = {
  title: 'Sign PDF in Chrome — Free Chrome Extension',
  description:
    'Sign PDF files directly in Chrome. Free, no signup, files stay on your device. Works with Gmail, Drive, and any website.',
  keywords: [
    'sign pdf chrome extension',
    'sign pdf in chrome',
    'pdf signature extension',
    'esign chrome',
    'free pdf signer',
    'chrome pdf signature',
    'sign pdf in browser',
  ],
  alternates: {
    canonical: '/sign-pdf-chrome-extension',
  },
  openGraph: {
    title: 'Sign PDF in Chrome — Free Chrome Extension',
    description:
      'Sign any PDF directly in your browser. Files stay on your device.',
    url: '/sign-pdf-chrome-extension',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/chrome-extension/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sign PDF in Chrome — free extension by SignMyPDF',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign PDF in Chrome — Free Chrome Extension',
    description: 'Sign any PDF directly in your browser.',
    images: ['/chrome-extension/og-image.png'],
  },
};

export default function SignPdfChromeExtensionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
