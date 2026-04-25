import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — SignMyPDF',
  description: 'SignMyPDF Pro dashboard.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
