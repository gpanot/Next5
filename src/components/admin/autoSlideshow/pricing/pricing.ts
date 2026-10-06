import { SLIDESHOW_PRICE_CENTS } from '../../../../types/admin/slideshowCredits';

/** Auto Slideshow pricing: pay as you go, $1.99 per slideshow, $10 minimum top-up. All money in cents. */

export const PRICE_CENTS = SLIDESHOW_PRICE_CENTS;
export const MIN_DEPOSIT_CENTS = 1_000;
export const DEPOSITS_CENTS = [1_000, 2_500, 5_000, 10_000] as const;
export const MAX_PER_DAY = 10;
export const DAYS_PER_MONTH = 30;

export const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
/** "$1.99": the price of one slideshow, for copy. */
export const PRICE_LABEL = money(PRICE_CENTS);
/** "$10" for whole dollars, "$29.70" otherwise. */
export const shortMoney = (cents: number): string => (cents % 100 === 0 ? `$${cents / 100}` : money(cents));

/** How far a balance goes at `perDay` slideshows a day. */
export const runway = (depositCents: number, perDay: number) => {
  const slideshows = Math.floor(depositCents / PRICE_CENTS);
  return { slideshows, days: Math.floor(slideshows / perDay) };
};

/**
 * Value stack, per slideshow. `anchor` is what the piece typically costs to hire out.
 * These anchors are placeholders to confirm before launch: only claims a buyer can check herself.
 */
export const VALUE_STACK: { title: string; detail: string; anchor: number }[] = [
  { title: 'We read your website', detail: 'Your brand, your product, your voice. No forms to fill.', anchor: 50 },
  { title: 'A format that already wins', detail: 'Every slideshow copies a layout that already pulls views on TikTok and Instagram.', anchor: 30 },
  { title: 'Hook and slides, written', detail: 'A scroll-stopping first slide, then 5 to 9 short tips.', anchor: 25 },
  { title: 'Fresh photos for your brand', detail: 'New photos made for each post. No stock look.', anchor: 20 },
  { title: 'Caption, hashtags and music', detail: 'Ready to post. Nothing left to do.', anchor: 10 },
  { title: 'Posted on autopilot', detail: 'Goes to your TikTok and Instagram every day. You approve with one tap.', anchor: 15 },
];

export const STACK_TOTAL = VALUE_STACK.reduce((sum, item) => sum + item.anchor, 0);

export const FAQ: { q: string; a: string }[] = [
  { q: 'Is this a subscription?', a: `No. You add money, and each slideshow takes ${PRICE_LABEL} from it. No monthly bill. No contract.` },
  { q: 'Why $10 to start?', a: `That is your balance, not a fee. $10 makes ${Math.floor(MIN_DEPOSIT_CENTS / PRICE_CENTS)} slideshows. Every cent goes to slideshows.` },
  { q: 'Can I post more than one a day?', a: `Yes. 2 a day is ${money(PRICE_CENTS * 2)}. 3 a day is ${money(PRICE_CENTS * 3)}. Change it any day.` },
  { q: 'What if my balance runs out?', a: 'Autopilot stops. Nothing is charged. Top up and it starts again.' },
  { q: 'Can I stop any time?', a: 'Yes. Pause autopilot and you pay $0. No calls, no forms.' },
  { q: 'Can’t I just use ChatGPT?', a: 'ChatGPT writes words. It does not pick a proven format, make the photos, put text on slides, add music or post for you every day. We do all of it.' },
  { q: 'Do I have to film or show my face?', a: 'No. Slideshows are photos and text. No camera, no editing.' },
];
