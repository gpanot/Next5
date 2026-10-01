/**
 * Next5 Homepage v3
 * Source of truth: new website/next5-homepage-v3-final.html
 * Server component — no 'use client'. Audience is server-read from ?for= URL param.
 * Interactivity (audience toggle, demo animation, forms) is handled by the inline
 * vanilla script in v3/script.ts. Motion (hero intro, split headings, scroll
 * reveals, phone tilt) is GSAP via <PageMotion>; smooth scroll is Lenis.
 */
import Script from 'next/script';
import { MotionPrepaint } from '../../motion/MotionPrepaint';
import { PageMotion } from '../../motion/PageMotion';
import { SmoothScroll } from '../../motion/SmoothScroll';
import type { Audience } from './v3/copy';
import { BASE_CSS } from './v3/styles';
import { MOTION_CSS } from './v3/motionStyles';
import { ART_CSS } from './v3/artStyles';
import { MonthRibbon } from './v3/MonthRibbon';
import { buildHomeScript } from './v3/script';
import { PromoBar, SiteNav, SiteFooter, StickyCta } from './v3/SiteChrome';
import { HeroSection } from './v3/HeroSection';
import { PainSection, WaysSection } from './v3/ProblemSections';
import { SwipeSection } from './v3/SwipeSection';
import { OfferSection } from './v3/OfferSection';
import { GuaranteeSection, NumbersSection, FitSection } from './v3/TrustSections';
import { FaqSection, FinalCtaSection } from './v3/ClosingSections';

export type { Audience };

export function HomePageV3({ audience = 'realtor' }: { audience?: Audience }) {
  return (
    <>
      {/* Google Font — React 19 hoists <link> to <head> */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS + MOTION_CSS + ART_CSS }} />

      <MotionPrepaint />
      {/* data-aud is set server-side so CSS hides other audiences before any JS runs. */}
      <div id="home-v3-root" data-aud={audience}>
        <PromoBar />
        <SiteNav />
        <main id="top">
          <HeroSection audience={audience} />
          <MonthRibbon />
          <PainSection audience={audience} />
          <WaysSection />
          <SwipeSection audience={audience} />
          <OfferSection audience={audience} />
          <GuaranteeSection />
          <NumbersSection />
          <FitSection audience={audience} />
          <FaqSection />
          <FinalCtaSection audience={audience} />
        </main>
        <SiteFooter />
        <StickyCta />
      </div>

      <SmoothScroll />
      <PageMotion rootId="home-v3-root" tilt />
      <Script id="home-v3-js" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: buildHomeScript() }} />
    </>
  );
}
