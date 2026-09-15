import type { Metadata } from 'next';
import { ChatGptCompare } from '../../../src/components/marketing/offer/ChatGptCompare';
import { OfferHero } from '../../../src/components/marketing/offer/OfferHero';
import { PostPhoneMock } from '../../../src/components/marketing/offer/PostPhoneMock';
import { PromiseBlock } from '../../../src/components/marketing/offer/PromiseBlock';
import { Testimonials } from '../../../src/components/marketing/offer/Testimonials';
import { ValueStack } from '../../../src/components/marketing/offer/ValueStack';
import { WhatYouGet } from '../../../src/components/marketing/offer/WhatYouGet';
import { FaqAccordion } from '../../../src/components/marketing/shared/FaqAccordion';
import { FinalCtaBand } from '../../../src/components/marketing/shared/FinalCtaBand';
import { PricingPreview } from '../../../src/components/marketing/shared/PricingPreview';
import { Section } from '../../../src/components/marketing/shared/Section';
import { StepsGrid } from '../../../src/components/marketing/shared/StepsGrid';
import { StickyMobileCta } from '../../../src/components/marketing/shared/StickyMobileCta';
import { BeforeAfterSlider } from '../../../src/components/marketing/shop/BeforeAfterSlider';
import { LooksGallery } from '../../../src/components/marketing/shop/LooksGallery';
import { MarketplaceFrames } from '../../../src/components/marketing/shop/MarketplaceFrames';
import { ModelChoice } from '../../../src/components/marketing/shop/ModelChoice';
import { SHOP } from '../../../src/content/business/marketing';
import { OFFER } from '../../../src/content/business/offer';

export const metadata: Metadata = {
  title: 'Next5 Shop — Your new drops, photographed every week',
  description: 'Paste your TikTok Shop link. Get listing-ready photos of every new product, worn by a model, every week. Listing packs, descriptions and hashtags included.',
};

export default function ShopPage() {
  const offer = OFFER.shop;
  const start = { href: '/start/shop', label: offer.hero.cta };
  const growth = { href: '/start/shop?plan=shop_pro&term=3', label: 'Start free, then Growth' };
  return (
    <>
      <OfferHero {...offer.hero} cta={start} secondary={{ href: '#pricing', label: 'See pricing' }} platforms={offer.platforms} visual={<PostPhoneMock post={offer.example} handle="your.shop" priority />} />
      <Section tone="sunken" eyebrow="See it work" title="Your product in. A model wearing it out." sub="Slide across the photo. Same color, same print, same length.">
        <div className="mx-auto max-w-md"><BeforeAfterSlider /></div>
      </Section>
      <Section eyebrow="Not just photos" title="Every photo comes ready to sell." sub="Each photo gets a Scroll-Stop Score and a Post Kit: the hook, the product description and the hashtags."><WhatYouGet post={offer.example} shop /></Section>
      <Section tone="sunken" eyebrow="The big question" title={offer.chatgpt.title} sub={offer.chatgpt.sub}><ChatGptCompare rows={offer.chatgpt.rows} /></Section>
      <Section eyebrow="How it works" title="From your shop link to listing packs."><StepsGrid steps={SHOP.steps} /></Section>
      <Section tone="sunken" eyebrow="Your brand" title="One look for your whole shop." sub="Pick a look that fits your shop. Every product comes out in the same light and place."><LooksGallery /></Section>
      <Section eyebrow="Models" title="Wear it yourself, or pick one of our models."><ModelChoice /></Section>
      <Section tone="sunken" eyebrow="Every size" title="Made for the places you sell."><MarketplaceFrames /></Section>
      <Section eyebrow="The offer" title={offer.stack.title} align="center"><ValueStack {...offer.stack} cta={growth} /></Section>
      <Section tone="sunken" eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={offer.promiseMatch} /></Section>
      <Testimonials items={offer.testimonials} />
      <Section tone="sunken" id="pricing" eyebrow="Pricing" title="Pick your plan. Try it free first." sub="Growth is built for shops with 100 to 500 products and new stock every week."><PricingPreview product="shop" /></Section>
      <Section eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={SHOP.faq} /></Section>
      <FinalCtaBand title="Your next drop, listing-ready." body="Paste your shop link. We photograph your best seller for free." href={start.href} cta={start.label} />
      <StickyMobileCta href={start.href} label="Paste my shop link" />
    </>
  );
}
