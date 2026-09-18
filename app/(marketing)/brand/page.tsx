import type { Metadata } from 'next';
import { IndustryTabs } from '../../../src/components/marketing/brand/IndustryTabs';
import { SetsGallery } from '../../../src/components/marketing/brand/SetsGallery';
import { ThemesScroller } from '../../../src/components/marketing/brand/ThemesScroller';
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
import { BRAND } from '../../../src/content/business/marketing';
import { OFFER } from '../../../src/content/business/offer';

export const metadata: Metadata = {
  title: 'Next5 Brand — Your month of posts, done in 10 minutes',
  description: 'New photos of you that follow the trends, with the hook, caption and hashtags written for you. For realtors, coaches and beauty pros.',
};

export default function BrandPage() {
  const offer = OFFER.brand;
  const start = { href: '/start/brand', label: offer.hero.cta };
  const growth = { href: '/start/brand?plan=brand_pro&term=3', label: 'Start free, then Growth' };
  return (
    <>
      <OfferHero {...offer.hero} cta={start} secondary={{ href: '#pricing', label: 'See pricing' }} platforms={offer.platforms} sources={offer.sources} visual={<PostPhoneMock post={offer.example} handle="your.name" priority />} />
      <Section tone="sunken" eyebrow="Not just photos" title="Every photo comes ready to post." sub="Each photo gets a Scroll-Stop Score and a Post Kit: the hook, the caption and the hashtags."><WhatYouGet post={offer.example} shop={false} /></Section>
      <Section eyebrow="The big question" title={offer.chatgpt.title} sub={offer.chatgpt.sub}><ChatGptCompare rows={offer.chatgpt.rows} /></Section>
      <Section tone="sunken" eyebrow="How it works" title="Five minutes. A whole month of posts."><StepsGrid steps={BRAND.steps} /></Section>
      <Section eyebrow="Trends" title="New trend themes every month." sub="New ideas come out on the 1st, made for your job. Use this month’s theme or any theme you like."><ThemesScroller /></Section>
      <Section tone="sunken" eyebrow="Your brand" title="Pick a style. Look the same in every post." sub="Your style is your look. Same light, same place, same feel every time. Your feed looks like you."><SetsGallery /></Section>
      <Section eyebrow="Made for your job" title="Photos for the work you really do."><IndustryTabs /></Section>
      <Section tone="sunken" eyebrow="The offer" title={offer.stack.title} align="center"><ValueStack {...offer.stack} cta={growth} /></Section>
      <Section eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={offer.promiseMatch} /></Section>
      <Testimonials items={offer.testimonials} tone="sunken" />
      <Section id="pricing" eyebrow="Pricing" title="Pick your plan. Try it free first."><PricingPreview product="brand" /></Section>
      <Section tone="sunken" eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={BRAND.faq} /></Section>
      <div className="pt-16 sm:pt-24"><FinalCtaBand title="Look like the go-to pro in your city." body="Start with 3 free photos of you. No card needed." href={start.href} cta={start.label} /></div>
      <StickyMobileCta href={start.href} label="Start free" />
    </>
  );
}
