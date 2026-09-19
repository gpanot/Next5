import { HOME_CHOOSER, HOME_FAQ, HOME_FINAL, HOME_MONTH, HOME_PROOF } from '../../../content/business/home';
import { HOME_TESTIMONIALS, OFFER_HOME } from '../../../content/business/offer';
import { UGC, UGC_HOME } from '../../../content/business/ugc';
import { ChatGptCompare } from '../offer/ChatGptCompare';
import { PromiseBlock } from '../offer/PromiseBlock';
import { Testimonials } from '../offer/Testimonials';
import { UgcOffer } from '../offer/UgcOffer';
import { UgcVideoMock } from '../offer/UgcVideoMock';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { Section } from '../shared/Section';
import { StickyMobileCta } from '../shared/StickyMobileCta';
import { HomeHero } from './HomeHero';
import { HomeHowItWorks } from './HomeHowItWorks';
import { HomeProof } from './HomeProof';
import { MonthGrid } from './MonthGrid';
import { ProductChooser } from './ProductChooser';

/** Both UGC examples side by side, on phones too (one small phone each); one "made by our team" badge. */
const HomeUgcVisual = () => (
  <div className="mx-auto flex max-w-xl items-start justify-center gap-3 sm:gap-6">
    <div className="w-1/2"><UgcVideoMock video={UGC.brand.video} /></div>
    <div className="w-1/2 pt-8 sm:pt-12"><UgcVideoMock video={UGC.shop.video} badge={false} /></div>
  </div>
);

/**
 * Business home at `/`, for two buyers only: realtors and TikTok Shop sellers. Pictures first, few words:
 * hero with two photo "doors" → a month of sample posts → videos → before/after proof with the words we write →
 * steps and calendar → plans → the ChatGPT question → promise → FAQ → two direct starts.
 * Phones get a sticky bar with both free starts.
 */
export const BusinessHome = () => (
  <>
    <HomeHero />
    <Section tone="sunken" eyebrow={HOME_MONTH.eyebrow} title={HOME_MONTH.title} sub={HOME_MONTH.sub}><MonthGrid /></Section>
    <Section eyebrow={UGC_HOME.eyebrow} title={UGC_HOME.title} sub={UGC_HOME.sub}><UgcOffer points={UGC_HOME.points} visual={<HomeUgcVisual />} /></Section>
    <Section tone="sunken" eyebrow={HOME_PROOF.eyebrow} title={HOME_PROOF.title} sub={HOME_PROOF.sub}><HomeProof /></Section>
    <Section eyebrow="How it works" title="Set it up once. Post all month."><HomeHowItWorks /></Section>
    <Section tone="sunken" id="studios" eyebrow={HOME_CHOOSER.eyebrow} title={HOME_CHOOSER.title}><ProductChooser /></Section>
    <Section eyebrow="The big question" title={OFFER_HOME.chatgpt.title} sub={OFFER_HOME.chatgpt.sub}><ChatGptCompare rows={OFFER_HOME.chatgpt.rows} /></Section>
    <Section tone="sunken" eyebrow="Our promise" title="You can’t lose."><PromiseBlock matchPromise={OFFER_HOME.promiseMatch} /></Section>
    <Testimonials items={HOME_TESTIMONIALS} />
    <Section tone="sunken" eyebrow="FAQ" title="Your questions, answered." align="center"><FaqAccordion items={HOME_FAQ} /></Section>
    <div className="pt-12 sm:pt-24" />
    <FinalCtaBand title={HOME_FINAL.title} body={HOME_FINAL.body} href={HOME_FINAL.brand.href} cta={HOME_FINAL.brand.cta} secondary={{ href: HOME_FINAL.shop.href, cta: HOME_FINAL.shop.cta }} />
    <StickyMobileCta note="Start free · 3 photos · No card" href={HOME_FINAL.brand.href} label="Realtor" secondary={{ href: HOME_FINAL.shop.href, label: 'TikTok Shop' }} />
  </>
);
