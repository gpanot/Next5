import Link from 'next/link';
import { HOME } from '../../../content/business/marketing';
import { HOME_TESTIMONIALS, OFFER, OFFER_HOME } from '../../../content/business/offer';
import { ChatGptCompare } from '../offer/ChatGptCompare';
import { OfferHero } from '../offer/OfferHero';
import { PostPhoneMock } from '../offer/PostPhoneMock';
import { PromiseBlock } from '../offer/PromiseBlock';
import { Testimonials } from '../offer/Testimonials';
import { WhatYouGet } from '../offer/WhatYouGet';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { Section } from '../shared/Section';
import { StepsGrid } from '../shared/StepsGrid';
import { HomeProof } from './HomeProof';
import { ProductChooser } from './ProductChooser';

/** Two phones on desktop (a pro's post and a shop listing); the shop phone alone on small screens. */
const HomeVisual = () => (
  <div className="relative mx-auto flex max-w-xl items-start justify-center gap-6">
    <div className="hidden w-1/2 pt-12 sm:block"><PostPhoneMock post={OFFER.brand.example} handle="your.name" /></div>
    <div className="w-full sm:w-1/2"><PostPhoneMock post={OFFER.shop.example} handle="your.shop" priority /></div>
  </div>
);

/**
 * Business home at `/`. Mobile-first: headline → what Next5 makes → offer. Then: the product beyond photos,
 * proof, the ChatGPT question, pick a studio, promise, stories, objections, two direct starts.
 */
export const BusinessHome = () => (
  <>
    <OfferHero
      {...OFFER_HOME.hero}
      cta={{ href: '/brand', label: 'I sell a service' }}
      secondary={{ href: '/shop', label: 'I sell products online →' }}
      platforms={OFFER_HOME.platforms}
      visual={<HomeVisual />}
    />
    <Section tone="sunken" eyebrow="Not just photos" title="Every photo comes ready to post." sub="Each photo gets a Scroll-Stop Score and a Post Kit: the hook, the caption and the hashtags."><WhatYouGet post={OFFER.brand.example} shop={false} /></Section>
    <Section eyebrow={HOME.proof.eyebrow} title={HOME.proof.title} sub={HOME.proof.sub}><HomeProof /></Section>
    <Section tone="sunken" eyebrow="The big question" title={OFFER_HOME.chatgpt.title} sub={OFFER_HOME.chatgpt.sub}><ChatGptCompare rows={OFFER_HOME.chatgpt.rows} /></Section>
    <Section id="studios" eyebrow="Pick your studio" title="Which one fits you?"><ProductChooser /></Section>
    <Section tone="sunken" eyebrow="How it works" title="Set it up once. Post all month."><StepsGrid steps={HOME.steps} /></Section>
    <Section eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={OFFER_HOME.promiseMatch} /></Section>
    <Testimonials items={HOME_TESTIMONIALS} tone="sunken" />
    <Section eyebrow="FAQ" title="Your questions, answered." align="center">
      <FaqAccordion items={HOME.faq} />
      <p className="mt-8 text-center text-[14px] text-app-muted">
        Want photos just for your own Instagram? <Link href="/photos" className="font-medium text-app-accent hover:text-app-ink">Try Next5 Photos →</Link>
      </p>
    </Section>
    <FinalCtaBand title={HOME.final.title} body={HOME.final.body} href={HOME.final.brand.href} cta={HOME.final.brand.cta} secondary={{ href: HOME.final.shop.href, cta: HOME.final.shop.cta }} />
  </>
);
