import type { Metadata } from 'next';
import { FaqAccordion } from '../../../src/components/marketing/shared/FaqAccordion';
import { FinalCtaBand } from '../../../src/components/marketing/shared/FinalCtaBand';
import { PricingPreview } from '../../../src/components/marketing/shared/PricingPreview';
import { ProductHero } from '../../../src/components/marketing/shared/ProductHero';
import { Section } from '../../../src/components/marketing/shared/Section';
import { StepsGrid } from '../../../src/components/marketing/shared/StepsGrid';
import { StickyMobileCta } from '../../../src/components/marketing/shared/StickyMobileCta';
import { AccuracyPromise } from '../../../src/components/marketing/shop/AccuracyPromise';
import { BeforeAfterSlider } from '../../../src/components/marketing/shop/BeforeAfterSlider';
import { CostPerProduct } from '../../../src/components/marketing/shop/CostPerProduct';
import { LooksGallery } from '../../../src/components/marketing/shop/LooksGallery';
import { MarketplaceFrames } from '../../../src/components/marketing/shop/MarketplaceFrames';
import { ModelChoice } from '../../../src/components/marketing/shop/ModelChoice';
import { SHOP } from '../../../src/content/business/marketing';

export const metadata: Metadata = {
  title: 'Next5 Shop — On-model photos for every new product',
  description: 'Turn flat-lay and hanger photos into on-model photos in your shop’s look, sized for TikTok Shop, Shopee and Instagram.',
};

export default function ShopPage() {
  const start = { href: '/start/shop', label: SHOP.hero.cta };
  return (
    <>
      <ProductHero {...SHOP.hero} cta={start} secondary={{ href: '#pricing', label: 'See pricing' }} note="One product free. No payment details needed." visual={<BeforeAfterSlider />} />
      <Section tone="sunken" eyebrow="The math" title="Photograph a whole drop for less than one model booking."><CostPerProduct /></Section>
      <Section eyebrow="How it works" title="From hanger to listing in three steps."><StepsGrid steps={SHOP.steps} /></Section>
      <Section tone="sunken" eyebrow="Shop looks" title="One look for your whole feed." sub="Pick the look that matches your shop. Every product you add comes out in the same light and setting."><LooksGallery /></Section>
      <Section eyebrow="Models" title="Wear it yourself, or pick a Studio model."><ModelChoice /></Section>
      <Section tone="sunken" eyebrow="Formats" title="Built for the places you sell."><MarketplaceFrames /></Section>
      <Section><AccuracyPromise /></Section>
      <Section tone="sunken" id="pricing" eyebrow="Pricing" title="Prepaid plans. Top up when you restock."><PricingPreview product="shop" /></Section>
      <Section eyebrow="FAQ" title="Questions, answered." align="center"><FaqAccordion items={SHOP.faq} /></Section>
      <FinalCtaBand title="Your next drop deserves better photos." body="Try it free with one product. No payment details needed." href={start.href} cta={start.label} />
      <StickyMobileCta href={start.href} label="Try it free" />
    </>
  );
}
