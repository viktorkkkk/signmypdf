import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Tool surface — must differ from the educational article at
  // /blog/password-protect-pdf-online-free (whose metaTitle is frozen
  // per CLAUDE.md rule #1). Article frames the topic ("how to..."),
  // this page frames the action ("here's the encryption tool").
  title: 'Password Protect PDF Online — Free Encryption Tool',
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
    canonical: '/protect',
  },
  openGraph: {
    title: 'Password Protect PDF Online — Free Encryption Tool',
    description: 'Add a password to any PDF instantly. Free, secure, no registration required.',
    url: '/protect',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Password Protect PDF Online — Free Encryption Tool',
    description: 'Add a password to any PDF instantly. Free, secure, no registration required.',
  },
};

export default function ProtectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
