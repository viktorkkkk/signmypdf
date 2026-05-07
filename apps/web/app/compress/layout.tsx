import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compress PDF Online Free — Reduce PDF File Size',
  description: 'Reduce PDF file size to fit email attachments and upload limits. Free, no registration, works in your browser. See the result before downloading.',
  keywords: [
    'compress pdf online',
    'reduce pdf size',
    'shrink pdf file',
    'compress pdf free',
    'reduce pdf file size for email',
    'optimize pdf in browser',
    'free pdf compressor',
    'make pdf smaller',
  ],
  alternates: {
    canonical: '/compress',
  },
  openGraph: {
    title: 'Compress PDF Online Free — Reduce PDF File Size',
    description: 'Reduce PDF file size to fit email attachments and upload limits. Free, no registration, works in your browser.',
    url: '/compress',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compress PDF Online Free — SignMyPDF',
    description: 'Reduce PDF file size to fit email attachments and upload limits. Free, no registration.',
  },
};

export default function CompressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
