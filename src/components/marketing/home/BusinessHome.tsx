import { HOME_CHOOSER, HOME_FAQ, HOME_FINAL, HOME_MONTH, HOME_POST_KIT, HOME_PROOF } from '../../../content/business/home';
import { HOME_TESTIMONIALS, OFFER, OFFER_HOME } from '../../../content/business/offer';
import { UGC, UGC_HOME } from '../../../content/business/ugc';
import { ChatGptCompare } from '../offer/ChatGptCompare';
import { PromiseBlock } from '../offer/PromiseBlock';
import { Testimonials } from '../offer/Testimonials';
import { UgcOffer } from '../offer/UgcOffer';
import { UgcVideoMock } from '../offer/UgcVideoMock';
import { WhatYouGet } from '../offer/WhatYouGet';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { Section } from '../shared/Section';
import { StickyMobileCta } from '../shared/StickyMobileCta';
import { HomeHero } from './HomeHero';
import { HomeHowItWorks } from './HomeHowItWorks';
import { HomeProof } from './HomeProof';
import { MonthGrid } from './MonthGrid';
import { ProductChooser } from './ProductChooser';

/** Both UGC examples side by side; the second phone hides on small screens to keep the page short. */
const HomeUgcVisual = () => (
  <div className="mx-auto flex max-w-xl items-start justify-center gap-6">
    <div className="w-full sm:w-1/2"><UgcVideoMock video={UGC.brand.video} /></div>
    <div className="hidden w-1/2 pt-12 sm:block"><UgcVideoMock video={UGC.shop.video} /></div>
  </div>
);

/**
 * Business home at `/`, for two buyers only: realtors and TikTok Shop sellers. Pictures first, few words:
 * hero with two photo "doors" → a month of sample posts → videos → before/after proof → the words we write →
 * steps → the ChatGPT question → plans → promise → FAQ → two direct starts.
 */
export const BusinessHome = () => (
  <>
    <HomeHero />
    <Section tone="sunken" eyebrow={HOME_MONTH.eyebrow} title={HOME_MONTH.title} sub={HOME_MONTH.sub}><MonthGrid /></Section>
    <Section eyebrow={UGC_HOME.eyebrow} title={UGC_HOME.title} sub={UGC_HOME.sub}><UgcOffer points={UGC_HOME.points} visual={<HomeUgcVisual />} /></Section>
    <Section tone="sunken" eyebrow={HOME_PROOF.eyebrow} title={HOME_PROOF.title} sub={HOME_PROOF.sub}><HomeProof /></Section>
    <Section eyebrow={HOME_POST_KIT.eyebrow} title={HOME_POST_KIT.title} sub={HOME_POST_KIT.sub}><WhatYouGet post={OFFER.brand.example} shop={false} /></Section>
    <Section tone="sunken" eyebrow="How it works" title="Set it up once. Post all month."><HomeHowItWorks /></Section>
    <Section eyebrow="The big question" title={OFFER_HOME.chatgpt.title} sub={OFFER_HOME.chatgpt.sub}><ChatGptCompare rows={OFFER_HOME.chatgpt.rows} /></Section>
    <Section tone="sunken" id="studios" eyebrow={HOME_CHOOSER.eyebrow} title={HOME_CHOOSER.title}><ProductChooser /></Section>
    <Section eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={OFFER_HOME.promiseMatch} /></Section>
    <Testimonials items={HOME_TESTIMONIALS} tone="sunken" />
    <Section eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={HOME_FAQ} /></Section>
    <FinalCtaBand title={HOME_FINAL.title} body={HOME_FINAL.body} href={HOME_FINAL.brand.href} cta={HOME_FINAL.brand.cta} secondary={{ href: HOME_FINAL.shop.href, cta: HOME_FINAL.shop.cta }} />
    <StickyMobileCta href="/#start" label="Get 3 free photos" />
  </>
);
