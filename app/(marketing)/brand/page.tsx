import type { Metadata } from 'next';
import { ListingMode } from '../../../src/components/marketing/brand/ListingMode';
import { SetsGallery } from '../../../src/components/marketing/brand/SetsGallery';
import { ThemesScroller } from '../../../src/components/marketing/brand/ThemesScroller';
import { ChatGptCompare } from '../../../src/components/marketing/offer/ChatGptCompare';
import { OfferHero } from '../../../src/components/marketing/offer/OfferHero';
import { PostPhoneMock } from '../../../src/components/marketing/offer/PostPhoneMock';
import { PromiseBlock } from '../../../src/components/marketing/offer/PromiseBlock';
import { Testimonials } from '../../../src/components/marketing/offer/Testimonials';
import { UgcOffer } from '../../../src/components/marketing/offer/UgcOffer';
import { ValueStack } from '../../../src/components/marketing/offer/ValueStack';
import { WhatYouGet } from '../../../src/components/marketing/offer/WhatYouGet';
import { FaqAccordion } from '../../../src/components/marketing/shared/FaqAccordion';
import { FinalCtaBand } from '../../../src/components/marketing/shared/FinalCtaBand';
import { PricingPreview } from '../../../src/components/marketing/shared/PricingPreview';
import { Section } from '../../../src/components/marketing/shared/Section';
import { StepsGrid } from '../../../src/components/marketing/shared/StepsGrid';
import { StickyMobileCta } from '../../../src/components/marketing/shared/StickyMobileCta';
import { UgcWallFor } from '../../../src/components/marketing/ugc/UgcWall';
import { BRAND } from '../../../src/content/business/marketing';
import { OFFER } from '../../../src/content/business/offer';
import { UGC } from '../../../src/content/business/ugc';

export const metadata: Metadata = {
  title: 'Next5 for Realtors — Your month of photos and videos, done for you',
  description: 'New photos of you, even inside your real listings, plus UGC videos made by our team. The hook, caption and hashtags are written for you. Made for real estate agents.',
};

export default function BrandPage() {
  const offer = OFFER.brand;
  const start = { href: '/start/brand', label: offer.hero.cta };
  const growth = { href: '/start/brand?plan=brand_pro&term=12', label: 'Start free, then Growth' };
  return (
    <>
      <OfferHero {...offer.hero} cta={start} secondary={{ href: '#pricing', label: 'See pricing' }} platforms={offer.platforms} sources={offer.sources} visual={<PostPhoneMock post={offer.example} handle="your.name" priority />} />
      <Section tone="sunken" eyebrow="Not just photos" title="Every photo comes ready to post." sub="Each photo gets a Scroll-Stop Score and a Post Kit: the hook, the caption and the hashtags."><WhatYouGet post={offer.example} shop={false} /></Section>
      <Section eyebrow="Your listings" title="Show up inside your real listings." sub="Slide across the photo. Left is the listing photo. Right is you, in the same room. Nothing in the home changes."><ListingMode /></Section>
      <Section tone="sunken" eyebrow={UGC.brand.eyebrow} title={UGC.brand.title} sub={UGC.brand.sub}><UgcOffer points={UGC.brand.points} visual={<UgcWallFor audience="realtor" />} /></Section>
      <Section eyebrow="The big question" title={offer.chatgpt.title} sub={offer.chatgpt.sub}><ChatGptCompare rows={offer.chatgpt.rows} /></Section>
      <Section tone="sunken" eyebrow="How it works" title="Five minutes. A whole month of posts."><StepsGrid steps={BRAND.steps} /></Section>
      <Section eyebrow="Trends" title="New real estate themes every month." sub="New ideas come out on the 1st, made for agents. Use this month’s theme or any theme you like."><ThemesScroller /></Section>
      <Section tone="sunken" eyebrow="Your brand" title="Pick a style. Look the same in every post." sub="Your style is your look. Same light, same place, same feel every time. Your feed looks like you."><SetsGallery /></Section>
      <Section eyebrow="The offer" title={offer.stack.title} align="center"><ValueStack {...offer.stack} cta={growth} /></Section>
      <Section tone="sunken" eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={offer.promiseMatch} /></Section>
      <Testimonials items={offer.testimonials} />
      <Section tone="sunken" id="pricing" eyebrow="Pricing" title="Pick your plan. Try it free first." sub="Every plan comes with UGC videos made by our team."><PricingPreview product="brand" /></Section>
      <Section eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={BRAND.faq} /></Section>
      <FinalCtaBand title="Look like the go-to agent in your city." body="Start with 3 free photos of you. No card needed." href={start.href} cta={start.label} />
      <StickyMobileCta href={start.href} label="Start free" />
    </>
  );
}
