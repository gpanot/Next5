import type { Metadata } from 'next';
import { LegalPage } from '../../../src/components/marketing/legal/LegalPage';
import { PublicFooter } from '../../../src/components/admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../../../src/components/admin/autoSlideshow/workspace/PublicTopBar';
import { LEGAL_UPDATED, TERMS } from '../../../src/content/business/legal';

export const metadata: Metadata = { title: 'Terms of Service | Next5', description: 'The terms for using Next5 Auto Slideshow to make and post TikTok and Instagram content.', alternates: { canonical: '/terms' } };

/** Public terms for Auto Slideshow (linked from the Google, TikTok and Meta app settings). */
export default function SlideshowTermsPage() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar />
      <main>
        <LegalPage title="Terms of Service" updated={LEGAL_UPDATED} intro="These terms apply to Auto Slideshow." sections={TERMS} />
      </main>
      <PublicFooter />
    </div>
  );
}
