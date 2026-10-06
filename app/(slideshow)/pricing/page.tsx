import { PricingPage } from '../../../src/components/admin/autoSlideshow/pricing/PricingPage';
import { PublicFooter } from '../../../src/components/admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../../../src/components/admin/autoSlideshow/workspace/PublicTopBar';
import { SLIDESHOW_HOME } from '../../../src/components/admin/autoSlideshow/workspace/WorkspaceContext';

/** Auto Slideshow pricing, public: pay as you go, $1.99 per slideshow. Checkout is not wired yet. */
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
