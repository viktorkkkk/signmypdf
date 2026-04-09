import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'SignMyPDF — Free PDF Signature Tool | No Registration',
    template: '%s | SignMyPDF',
  },
  description: 'Sign PDF documents online for free. No registration required. Draw or type your signature and download instantly. Fast, secure, and legally binding electronic signatures.',
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
  openGraph: {
    title: 'SignMyPDF — Sign PDF Online Free',
    description: 'Sign PDF documents in seconds. No registration, no software. Draw or type your signature.',
    url: 'https://signmypdf.vercel.app',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SignMyPDF — Free PDF Signature Tool',
    description: 'Sign PDF documents online for free. No registration required.',
  },
  alternates: {
    canonical: 'https://signmypdf.vercel.app',
  },
  verification: {
    google: 'your-google-verification-code', // Replace with actual code when available
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
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
