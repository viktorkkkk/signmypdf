import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Split PDF Online Free — Extract Pages from PDF',
  description: 'Extract pages from a PDF or split it into multiple files. Free, no registration, works in your browser.',
  keywords: [
    'split pdf online',
    'extract pdf pages',
    'split pdf into multiple files',
    'pdf splitter free',
    'separate pdf pages',
    'cut pdf in browser',
    'free pdf splitter',
    'extract pages from pdf',
  ],
  alternates: {
    canonical: '/split',
  },
  openGraph: {
    title: 'Split PDF Online Free — Extract Pages from PDF',
    description: 'Extract pages from a PDF or split it into multiple files. Free, no registration, works in your browser.',
    url: '/split',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Split PDF Online Free — SignMyPDF',
    description: 'Extract pages from a PDF or split it into multiple files. Free, no registration.',
  },
};

export default function SplitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
