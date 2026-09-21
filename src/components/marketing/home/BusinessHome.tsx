import { HOME_CHOOSER, HOME_FAQ, HOME_FINAL, HOME_MONTH, HOME_PROOF } from '../../../content/business/home';
import { HOME_TESTIMONIALS, OFFER_HOME } from '../../../content/business/offer';
import { UGC_WALL } from '../../../content/business/tiktokUgc';
import { ChatGptCompare } from '../offer/ChatGptCompare';
import { PromiseBlock } from '../offer/PromiseBlock';
import { Testimonials } from '../offer/Testimonials';
import { FaqAccordion } from '../shared/FaqAccordion';
import { FinalCtaBand } from '../shared/FinalCtaBand';
import { Section } from '../shared/Section';
import { StickyMobileCta } from '../shared/StickyMobileCta';
import { UgcWall } from '../ugc/UgcWall';
import { CalendarHero } from './CalendarHero';
import { HomeHowItWorks } from './HomeHowItWorks';
import { HomeProof } from './HomeProof';
import { MonthGrid } from './MonthGrid';
import { ProductChooser } from './ProductChooser';

/**
 * Business home at `/`, for two buyers only: realtors and TikTok Shop sellers.
 * Calendar hero (the month we fill) → real TikTok UGC videos → sample posts → before/after proof →
 * steps → plans → the ChatGPT question → promise → FAQ → two direct starts.
 * Phones get a sticky bar with both free starts.
 */
export const BusinessHome = () => (
  <>
    <CalendarHero />
    <Section tone="sunken" eyebrow={UGC_WALL.eyebrow} title={UGC_WALL.title} sub={UGC_WALL.sub}><UgcWall /></Section>
    <Section eyebrow={HOME_MONTH.eyebrow} title={HOME_MONTH.title} sub={HOME_MONTH.sub}><MonthGrid /></Section>
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
