import { HOME } from '../../../content/business/marketing';
import { HOME_TESTIMONIALS, OFFER, OFFER_HOME } from '../../../content/business/offer';
import { UGC, UGC_HOME } from '../../../content/business/ugc';
import { ChatGptCompare } from '../offer/ChatGptCompare';
import { OfferHero } from '../offer/OfferHero';
import { PostPhoneMock } from '../offer/PostPhoneMock';
import { PromiseBlock } from '../offer/PromiseBlock';
import { Testimonials } from '../offer/Testimonials';
import { UgcOffer } from '../offer/UgcOffer';
import { UgcVideoMock } from '../offer/UgcVideoMock';
import { WhatYouGet } from '../offer/WhatYouGet';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { Section } from '../shared/Section';
import { StepsGrid } from '../shared/StepsGrid';
import { HomeProof } from './HomeProof';
import { ProductChooser } from './ProductChooser';

/** Two phones on desktop (a realtor's post and a shop listing); the shop phone alone on small screens. */
const HomeVisual = () => (
  <div className="relative mx-auto flex max-w-xl items-start justify-center gap-6">
    <div className="hidden w-1/2 pt-12 sm:block"><PostPhoneMock post={OFFER.brand.example} handle="your.name" /></div>
    <div className="w-full sm:w-1/2"><PostPhoneMock post={OFFER.shop.example} handle="your.shop" priority /></div>
  </div>
);

/** Both UGC examples side by side; the second phone hides on small screens to keep the page short. */
const HomeUgcVisual = () => (
  <div className="mx-auto flex max-w-xl items-start justify-center gap-6">
    <div className="w-full sm:w-1/2"><UgcVideoMock video={UGC.brand.video} /></div>
    <div className="hidden w-1/2 pt-12 sm:block"><UgcVideoMock video={UGC.shop.video} /></div>
  </div>
);

/**
 * Business home at `/`, for two buyers only: realtors and TikTok Shop sellers. Mobile-first: headline → what
 * Next5 makes → offer. Then: ready-to-post photos, UGC videos, proof, the ChatGPT question, pick a studio,
 * promise, stories, objections, two direct starts.
 */
export const BusinessHome = () => (
  <>
    <OfferHero
      {...OFFER_HOME.hero}
      cta={{ href: '/brand', label: 'I’m a realtor' }}
      secondary={{ href: '/shop', label: 'I sell on TikTok Shop →' }}
      platforms={OFFER_HOME.platforms}
      sources={OFFER_HOME.sources}
      visual={<HomeVisual />}
    />
    <Section tone="sunken" eyebrow="Not just photos" title="Every photo comes ready to post." sub="Each photo gets a Scroll-Stop Score and a Post Kit: the hook, the caption and the hashtags."><WhatYouGet post={OFFER.brand.example} shop={false} /></Section>
    <Section eyebrow={UGC_HOME.eyebrow} title={UGC_HOME.title} sub={UGC_HOME.sub}><UgcOffer points={UGC_HOME.points} visual={<HomeUgcVisual />} /></Section>
    <Section tone="sunken" eyebrow={HOME.proof.eyebrow} title={HOME.proof.title} sub={HOME.proof.sub}><HomeProof /></Section>
    <Section eyebrow="The big question" title={OFFER_HOME.chatgpt.title} sub={OFFER_HOME.chatgpt.sub}><ChatGptCompare rows={OFFER_HOME.chatgpt.rows} /></Section>
    <Section tone="sunken" id="studios" eyebrow="Pick your plan" title="Realtor or TikTok Shop seller?"><ProductChooser /></Section>
    <Section eyebrow="How it works" title="Set it up once. Post all month."><StepsGrid steps={HOME.steps} /></Section>
    <Section tone="sunken" eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={OFFER_HOME.promiseMatch} /></Section>
    <Testimonials items={HOME_TESTIMONIALS} />
    <Section tone="sunken" eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={HOME.faq} /></Section>
    <div className="pt-16 sm:pt-24"><FinalCtaBand title={HOME.final.title} body={HOME.final.body} href={HOME.final.brand.href} cta={HOME.final.brand.cta} secondary={{ href: HOME.final.shop.href, cta: HOME.final.shop.cta }} /></div>
  </>
);
