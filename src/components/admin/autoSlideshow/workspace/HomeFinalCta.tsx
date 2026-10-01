import { SplitWords } from '../../../motion/SplitWords';
import { PRICE_CENTS } from '../pricing/pricing';
import { SiteForm } from './SiteForm';

/** Last ask on the /slideshow home, after the FAQ: same website box as the hero. */
export function HomeFinalCta() {
  return (
    <section aria-labelledby="slideshow-final" className="relative mx-auto w-full max-w-4xl pb-16 md:pb-24">
      <div data-reveal="" className="flex flex-col items-center rounded-[2rem] bg-ink px-5 py-12 text-center shadow-sm md:px-12 md:py-16 dark:bg-zinc-100">
        <h2 id="slideshow-final" data-split="" className="max-w-xl text-3xl font-extrabold tracking-tight text-balance text-white md:text-5xl dark:text-zinc-900">
          <SplitWords text="Your first slideshows in about 5 minutes." />
        </h2>
        <p className="mt-4 max-w-md text-base text-white/70 md:text-lg dark:text-zinc-600">Paste your website. You approve every post first.</p>
        <SiteForm className="mt-8" />
        <p className="mt-4 text-[13px] text-white/60 dark:text-zinc-500">{PRICE_CENTS}¢ a post. No subscription. No contract.</p>
      </div>
    </section>
  );
}
