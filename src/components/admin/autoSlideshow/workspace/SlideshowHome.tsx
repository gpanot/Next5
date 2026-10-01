'use client';

import { MotionPrepaint } from '../../../motion/MotionPrepaint';
import { PageMotion } from '../../../motion/PageMotion';
import { SmoothScroll } from '../../../motion/SmoothScroll';
import { SplitWords } from '../../../motion/SplitWords';
import { PRICE_CENTS } from '../pricing/pricing';
import { SlideshowSideDecks, SlideshowStrip } from '../SlideshowShowcase';
import { HomeFaq } from './HomeFaq';
import { HomeFinalCta } from './HomeFinalCta';
import { HomeStory } from './HomeStory';
import { PlatformBadges } from './PlatformBadges';
import { PublicFooter } from './PublicFooter';
import { PublicTopBar } from './PublicTopBar';
import { SiteForm } from './SiteForm';
import { slideshowDeckMotion } from './slideshowDeckMotion';

const ROOT_ID = 'slideshow-home';

/** /slideshow: the public Auto Slideshow home. Website in, then sign in (the email link also signs up), then the run starts. */
export function SlideshowHome() {
  return (
    <div id={ROOT_ID} className="min-h-dvh bg-app-bg">
      <MotionPrepaint />
      <PublicTopBar page="home" />
      <main className="relative px-4 py-4 md:px-8 md:py-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle,rgb(0_0_0/0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)]" />
        <SlideshowSideDecks />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center pt-8 pb-4 text-center md:max-w-4xl md:py-10 lg:max-w-5xl xl:max-w-6xl">
          <div data-intro="1"><PlatformBadges /></div>
          <h1 data-intro-split="" className="text-[2.375rem] leading-[1.05] font-extrabold tracking-tight text-balance text-ink md:text-5xl md:leading-[1.0] lg:text-[3.625rem] dark:text-zinc-100">
            <SplitWords className="block xl:whitespace-nowrap" text="Slideshows that bring you customers." />
            <SplitWords className="mt-2 block text-blue-600 md:mt-1 lg:whitespace-nowrap dark:text-blue-400" text={`No filming. No editing. ${PRICE_CENTS}¢ a post.`} />
          </h1>
          <p data-intro="2" className="mt-5 max-w-sm text-[17px] leading-relaxed text-muted md:mt-4 md:max-w-none md:text-base lg:text-lg dark:text-zinc-400">Paste your website. Get posts built on formats that already get views.</p>
          <SiteForm className="mt-7" />
          <p className="mt-4 text-[13px] text-muted md:mt-3 md:text-xs">Ready in about 5 minutes. You approve every post first.</p>
          <SlideshowStrip />
        </div>
        <HomeStory />
        <HomeFaq />
        <HomeFinalCta />
      </main>
      <PublicFooter />
      <SmoothScroll />
      <PageMotion rootId={ROOT_ID} extra={slideshowDeckMotion} />
    </div>
  );
}
