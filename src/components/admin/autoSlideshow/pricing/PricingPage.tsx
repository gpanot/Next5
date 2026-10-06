import Link from 'next/link';
import { SlideshowStrip } from '../SlideshowShowcase';
import { CheckoutButton } from './CheckoutButton';
import { PriceCalculator } from './PriceCalculator';
import { PricingFaq } from './PricingFaq';
import { DAYS_PER_MONTH, MIN_DEPOSIT_CENTS, PRICE_CENTS, PRICE_LABEL, money, shortMoney } from './pricing';
import { ValueStack } from './ValueStack';

const PER_DAY_EXAMPLES = [1, 2, 3];

const PROMISES = [
  { title: 'No subscription', detail: 'No monthly bill. You only pay for slideshows we make.' },
  { title: 'Pause any day', detail: 'Stop autopilot and you pay $0. Start again with one tap.' },
  { title: 'Every cent is a post', detail: `Your ${shortMoney(MIN_DEPOSIT_CENTS)} is balance, not a fee. It all goes to slideshows.` },
];

function Hero({ homeHref }: { homeHref: string }) {
  return (
    <section className="flex flex-col items-center text-center">
      <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-700 uppercase dark:bg-blue-950 dark:text-blue-300">Pay as you go · No subscription</p>
      <h2 className="mt-5 text-4xl leading-[1.12] font-extrabold tracking-tight text-ink md:text-6xl dark:text-zinc-100">
        A new TikTok post
        <br />
        every day. <span className="text-blue-600 dark:text-blue-400">For {PRICE_LABEL}.</span>
      </h2>
      <p className="mt-5 max-w-xl text-base text-muted md:text-lg dark:text-zinc-400">We make it from your website and post it for you. You don’t film. You don’t write. You don’t design.</p>
      <div className="mt-8 flex items-end gap-2">
        <span className="text-6xl font-extrabold tracking-tighter text-ink md:text-7xl dark:text-zinc-100">{PRICE_LABEL}</span>
        <span className="pb-2 text-left text-sm leading-tight text-muted dark:text-zinc-400">per slideshow
          <br />per day</span>
      </div>
      <p className="mt-2 text-sm text-muted dark:text-zinc-400">{shortMoney(MIN_DEPOSIT_CENTS)} to start. That’s {Math.floor(MIN_DEPOSIT_CENTS / PRICE_CENTS)} slideshows.</p>
      <div className="mt-6 w-full sm:w-auto"><CheckoutButton /></div>
      <Link href={homeHref} className="mt-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">Or see a free sample on your site</Link>
    </section>
  );
}

function PerDayTiles() {
  return (
    <div className="grid w-full grid-cols-3 gap-2 md:gap-4">
      {PER_DAY_EXAMPLES.map((n) => (
        <div key={n} className="rounded-2xl border border-line bg-white p-3 text-center shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-muted md:text-sm dark:text-zinc-400">{n} a day</p>
          <p className="mt-1 text-xl font-extrabold text-ink tabular-nums md:text-3xl dark:text-zinc-100">{money(PRICE_CENTS * n)}</p>
          <p className="mt-1 text-[11px] text-muted md:text-xs dark:text-zinc-400">≈ {money(PRICE_CENTS * n * DAYS_PER_MONTH)}/mo</p>
        </div>
      ))}
    </div>
  );
}

function Promises() {
  return (
    <section className="grid w-full gap-3 md:grid-cols-3">
      {PROMISES.map((p) => (
        <div key={p.title} className="rounded-2xl border border-line bg-white p-5 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-bold text-ink dark:text-zinc-100">{p.title}</p>
          <p className="mt-1 text-sm text-muted dark:text-zinc-400">{p.detail}</p>
        </div>
      ))}
    </section>
  );
}

/** Auto Slideshow pricing, Hormozi style: price up front, the math, the value stack, the promises, the objections. */
/** `homeHref`: where "see a free sample" leads (the public home, or the admin page). */
export function PricingPage({ homeHref = '/admin/auto-slideshow' }: { homeHref?: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-16 py-8 md:gap-24 md:py-16">
      <div className="flex w-full flex-col items-center">
        <Hero homeHref={homeHref} />
        <SlideshowStrip />
      </div>
      <section className="flex w-full flex-col items-center gap-6">
        <h3 className="text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl dark:text-zinc-100">Want more? Just add more.</h3>
        <p className="-mt-3 text-center text-base text-muted dark:text-zinc-400">{PRICE_LABEL} each. 2 a day is {money(PRICE_CENTS * 2)}. That’s it.</p>
        <PerDayTiles />
        <PriceCalculator />
      </section>
      <ValueStack />
      <Promises />
      <PricingFaq />
      <section className="flex flex-col items-center text-center">
        <h3 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl dark:text-zinc-100">Your first 10 posts cost less than lunch.</h3>
        <p className="mt-3 text-base text-muted dark:text-zinc-400">{shortMoney(MIN_DEPOSIT_CENTS)} in. A new slideshow every day. Stop whenever you want.</p>
        <div className="mt-6 w-full sm:w-auto"><CheckoutButton /></div>
      </section>
    </div>
  );
}
