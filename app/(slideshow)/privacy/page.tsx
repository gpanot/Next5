import type { Metadata } from 'next';
import { LegalPage } from '../../../src/components/marketing/legal/LegalPage';
import { PublicFooter } from '../../../src/components/admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../../../src/components/admin/autoSlideshow/workspace/PublicTopBar';
import { LEGAL_UPDATED, PRIVACY } from '../../../src/content/business/legal';

export const metadata: Metadata = { title: 'Privacy Policy — Auto Slideshow' };

/** Public privacy policy for Auto Slideshow (linked from the Google, TikTok and Meta app settings). */
export default function SlideshowPrivacyPage() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar />
      <main>
        <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED} intro="How Auto Slideshow handles your personal data, photos and connected accounts." sections={PRIVACY} />
      </main>
      <PublicFooter />
    </div>
  );
}
