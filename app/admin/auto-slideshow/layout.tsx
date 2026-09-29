import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auto Slideshow',
  robots: { index: false, follow: false },
};

export default function AutoSlideshowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
