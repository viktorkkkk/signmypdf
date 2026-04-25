import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'SignMyPDF — Free PDF Signature Tool | No Registration',
    template: '%s | SignMyPDF',
  },
  description: 'Sign PDF documents online for free. No registration. Draw or type your signature, download instantly. Legally binding electronic signatures.',
  keywords: ['sign pdf online', 'pdf signature', 'electronic signature', 'sign pdf free', 'pdf signer', 'digital signature', 'esign pdf', 'online signature tool'],
  authors: [{ name: 'SignMyPDF' }],
  creator: 'SignMyPDF',
  publisher: 'SignMyPDF',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Base for all metadata-derived URLs (canonical, og.url, twitter card, sitemap).
  // Canonical = www; apex 307-redirects to www.
  metadataBase: new URL('https://www.signmypdf.io'),
  // Root metadata represents the homepage `/`. Every other public route
  // ships its own `app/<route>/layout.tsx` (or in-file metadata block for
  // server components) that overrides `alternates` and `openGraph` —
  // Next.js replaces these blocks wholesale rather than deep-merging, so
  // child routes do NOT inherit this canonical or og:url. See the SEO
  // Indexing Status section in CLAUDE.md for the per-page source-of-truth
  // list and the rule for adding new routes.
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'SignMyPDF — Sign PDF Online Free',
    description: 'Sign PDF documents in seconds. No registration, no software. Draw or type your signature.',
    url: '/',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SignMyPDF — Free PDF Signature Tool',
    description: 'Sign PDF documents online for free. No registration required.',
  },
  verification: {
    google: 'T8qgvPjWrXpKbKE-O6pwBD3xir2SKHBGo1vxdikCEyo',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#2563eb" />
        
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SP5ZZJ3D17"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SP5ZZJ3D17', {
              'anonymize_ip': true,
              'cookie_flags': 'SameSite=None;Secure'
            });
          `
        }} />
      </head>
      <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>{children}</body>
    </html>
  );
}
