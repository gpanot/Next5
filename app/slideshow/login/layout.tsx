import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Private Auto Slideshow page: kept out of search and AI indexes. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrivateSlideshowLayout({ children }: { children: ReactNode }) {
  return children;
}
