import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { BusinessSurface } from '../../src/components/ui/BusinessSurface';
import { SkeletonText } from '../../src/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'Auto Slideshow',
  robots: { index: false, follow: false },
};

export default function SlideshowLayout({ children }: { children: ReactNode }) {
  return (
    <BusinessSurface>
      <Suspense fallback={<div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>}>{children}</Suspense>
    </BusinessSurface>
  );
}
