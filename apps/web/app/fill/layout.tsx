import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fill PDF Form Online Free — Type into Any PDF',
  description: 'Fill out any PDF form in your browser. Add text, dates, checkmarks. No printing, no flattening — just type and download. 100% free, no registration.',
  keywords: [
    'fill pdf form online',
    'pdf form filler',
    'fill pdf free',
    'type into pdf',
    'fill pdf without adobe',
    'edit pdf form online',
    'fill pdf no registration',
  ],
  alternates: {
    canonical: '/fill',
  },
  openGraph: {
    title: 'Fill PDF Form Online Free — Type into Any PDF',
    description: 'Add text, dates, checkmarks to any PDF. No printing, no flattening, no registration.',
    url: '/fill',
    siteName: 'SignMyPDF',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fill PDF Form Online Free — SignMyPDF',
    description: 'Add text, dates, checkmarks to any PDF. No printing required.',
  },
};

export default function FillLayout({ children }: { children: React.ReactNode }) {
  return children;
}
