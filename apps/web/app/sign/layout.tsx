import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign PDF Online Free — Draw or Type Your Signature',
  description: 'Sign any PDF in your browser. Draw or type your signature, place it on any page, download instantly. No registration, 100% client-side.',
  keywords: [
    'sign pdf online',
    'pdf signature',
    'electronic signature',
    'esign pdf',
    'free pdf signer',
    'draw pdf signature',
    'type pdf signature',
    'sign pdf without account',
  ],
  alternates: {
    canonical: '/sign',
  },
  openGraph: {
    title: 'Sign PDF Online Free — Draw or Type Your Signature',
    description: 'Draw or type your signature, place it on any page, download instantly. No registration.',
    url: '/sign',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign PDF Online Free — SignMyPDF',
    description: 'Draw or type your signature, place it on any page, download instantly.',
  },
};

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
