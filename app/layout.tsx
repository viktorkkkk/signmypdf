import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SignMyPDF — Sign PDF Online Free | No Registration',
  description: 'Sign PDF documents online for free. No registration required. Draw or type your signature and download instantly. Fast, secure, and legally binding.',
  keywords: 'sign pdf online, pdf signature, electronic signature, sign pdf free, pdf signer',
  openGraph: {
    title: 'SignMyPDF — Sign PDF Online Free',
    description: 'Sign PDF documents in seconds. No registration, no software.',
    url: 'https://signmypdf.io',
    siteName: 'SignMyPDF',
    type: 'website',
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
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
