import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Merge PDF Online Free — Combine PDF Files',
  description: 'Combine multiple PDFs into one file. Free, no registration, works in your browser. Drag and drop to reorder before merging.',
  keywords: [
    'merge pdf online',
    'combine pdf files',
    'join pdf online',
    'merge pdf free',
    'combine pdfs without adobe',
    'merge pdf in browser',
    'free pdf merger',
    'concatenate pdf files',
  ],
  alternates: {
    canonical: '/merge',
  },
  openGraph: {
    title: 'Merge PDF Online Free — Combine PDF Files',
    description: 'Combine multiple PDFs into one file. Free, no registration, works in your browser.',
    url: '/merge',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF Online Free — SignMyPDF',
    description: 'Combine multiple PDFs into one file. Free, no registration, works in your browser.',
  },
};

export default function MergeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
