import { SLIDESHOW_PRICE_CENTS, SLIDESHOW_PRICE_LABEL } from '../../../../types/admin/slideshowCredits';

/** Auto Slideshow pricing: pay as you go, one price per slideshow (SLIDESHOW_PRICE_CENTS), $10 minimum top-up. All money in cents. */

export const PRICE_CENTS = SLIDESHOW_PRICE_CENTS;
export const MIN_DEPOSIT_CENTS = 1_000;
export const DAYS_PER_MONTH = 30;

export const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
/** "$2.99": the price of one slideshow, for copy. */
export const PRICE_LABEL = SLIDESHOW_PRICE_LABEL;
/** "$10" for whole dollars, "$29.70" otherwise. */
export const shortMoney = (cents: number): string => (cents % 100 === 0 ? `$${cents / 100}` : money(cents));

/**
 * Value stack, per post. `anchor` is what the piece typically costs from an agency or a marketing hire.
 * These anchors are placeholders to confirm before launch: only claims a buyer can check herself.
 */
export const VALUE_STACK: { title: string; detail: string; anchor: number }[] = [
  { title: 'We read your website', detail: 'Your brand, your product, your voice. No forms. No strategy calls.', anchor: 150 },
  { title: 'A format that already wins', detail: 'Every post copies a layout that already pulls views on TikTok and Instagram.', anchor: 100 },
  { title: 'Hook and script, written', detail: 'A scroll-stopping first second, then short tips people save.', anchor: 75 },
  { title: 'Fresh photos and clips for your brand', detail: 'New visuals made for each post. No stock look. No photoshoot.', anchor: 200 },
  { title: 'Voice, captions, hashtags', detail: 'Ready to post. Nothing left to do.', anchor: 40 },
  { title: 'Posted on autopilot', detail: 'Goes to your TikTok and Instagram every day. You approve with one tap.', anchor: 60 },
];

export const STACK_TOTAL = VALUE_STACK.reduce((sum, item) => sum + item.anchor, 0);

export const FAQ: { q: string; a: string }[] = [
  { q: 'Is this a subscription?', a: `No. You add money, and each post takes ${PRICE_LABEL} from it. No monthly bill. No contract.` },
  { q: 'Why $10 to start?', a: `That is your balance, not a fee. $10 makes ${Math.floor(MIN_DEPOSIT_CENTS / PRICE_CENTS)} posts. Every cent goes to posts.` },
  { q: 'Can I post more than one a day?', a: `Yes. 2 a day is ${money(PRICE_CENTS * 2)}. 3 a day is ${money(PRICE_CENTS * 3)}. Change it any day.` },
  { q: 'What if my balance runs out?', a: 'Autopilot stops. Nothing is charged. Top up and it starts again.' },
  { q: 'Can I stop any time?', a: 'Yes. Pause autopilot and you pay $0. No calls, no forms.' },
  { q: 'Can’t I just use ChatGPT?', a: 'ChatGPT writes words. It does not pick a proven format, make the photos and clips, edit the video or post for you every day. We do all of it.' },
  { q: 'Do I have to film or show my face?', a: 'No. We make the photos and clips. No camera, no editing.' },
];
