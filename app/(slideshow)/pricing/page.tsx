import type { Metadata } from 'next';
import { PricingPage } from '../../../src/components/admin/autoSlideshow/pricing/PricingPage';
import { PublicFooter } from '../../../src/components/admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../../../src/components/admin/autoSlideshow/workspace/PublicTopBar';
import { SLIDESHOW_HOME } from '../../../src/components/admin/autoSlideshow/workspace/WorkspaceContext';
import { SLIDESHOW_PRICE_LABEL } from '../../../src/types/admin/slideshowCredits';

export const metadata: Metadata = {
  title: `Pricing: ${SLIDESHOW_PRICE_LABEL} per Post, No Subscription | Next5`,
  description: `Social media content for your small business at ${SLIDESHOW_PRICE_LABEL} a TikTok or Instagram post. Pay as you go. No subscription, no contract. Pause any day.`,
  alternates: { canonical: '/pricing' },
};

/** Auto Slideshow pricing, public: pay as you go, one price per slideshow. Checkout is not wired yet. */
export default function SlideshowPricingPage() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar page="pricing" />
      <main className="px-4 py-4 md:px-8 md:py-8">
        <PricingPage homeHref={SLIDESHOW_HOME} />
      </main>
      <PublicFooter />
    </div>
  );
}
