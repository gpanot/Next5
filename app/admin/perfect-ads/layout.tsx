import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perfect Ads',
  robots: { index: false, follow: false },
};

export default function PerfectAdsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
