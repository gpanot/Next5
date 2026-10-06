import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { BusinessSurface } from '../../src/components/ui/BusinessSurface';
import { SkeletonText } from '../../src/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'Auto Slideshow: slideshows that bring you customers',
  description: 'Paste your website. Get TikTok and Instagram slideshows built on formats that already get views. No filming, no editing. $1.99 a post.',
};

export default function SlideshowLayout({ children }: { children: ReactNode }) {
  return (
    <BusinessSurface>
      <Suspense fallback={<div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>}>{children}</Suspense>
    </BusinessSurface>
  );
}
