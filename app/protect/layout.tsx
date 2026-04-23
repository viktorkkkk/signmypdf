import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Password Protect PDF Online Free (2026)',
  description: 'Add a password to any PDF instantly. Free, secure, no registration required. Lock PDF from editing, copying and printing.',
  keywords: [
    'password protect pdf',
    'encrypt pdf online',
    'lock pdf online',
    'protect pdf without adobe',
    'password protect pdf free',
    'lock pdf from editing',
    'secure pdf file',
    'pdf encryption online',
  ],
  alternates: {
    canonical: 'https://signmypdf.io/protect',
  },
  openGraph: {
    title: 'Password Protect PDF Online Free',
    description: 'Add a password to any PDF instantly. Free, secure, no registration required.',
    url: 'https://signmypdf.io/protect',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Password Protect PDF Online Free',
    description: 'Add a password to any PDF instantly. Free, secure, no registration required.',
  },
};

export default function ProtectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
