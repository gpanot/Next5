import { PricingPage } from '../../../src/components/admin/autoSlideshow/pricing/PricingPage';
import { PublicTopBar } from '../../../src/components/admin/autoSlideshow/workspace/PublicTopBar';

/** Auto Slideshow pricing, public: pay as you go, 99¢ per slideshow. Checkout is not wired yet. */
export default function SlideshowPricingPage() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar page="pricing" />
      <main className="px-4 py-4 md:px-8 md:py-8">
        <PricingPage homeHref="/slideshow" />
      </main>
    </div>
  );
}
