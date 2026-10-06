import { MIN_DEPOSIT_CENTS, PRICE_LABEL, shortMoney } from '../pricing/pricing';

const price = PRICE_LABEL;
const minimum = shortMoney(MIN_DEPOSIT_CENTS);

/** Questions on the public Auto Slideshow home. Plain words, only claims a buyer can check. Also feeds the FAQPage JSON-LD. */
export const HOME_FAQ: { q: string; a: string }[] = [
  { q: 'What is Auto Slideshow?', a: 'You paste your website. We make TikTok and Instagram photo slideshows about your brand. Each one has a hook, 5 to 9 slides, a caption and hashtags. We post them for you.' },
  { q: 'How long does it take?', a: 'About 3 to 5 minutes for your first slideshows. You do not need to stay on the page.' },
  { q: 'Why do these slideshows work?', a: 'Each one copies a format that already pulls views on TikTok and Instagram. We only use formats from our approved list.' },
  { q: 'Can’t I just use ChatGPT?', a: 'ChatGPT writes words. It does not pick a proven format, make the photos, put text on slides or post to TikTok and Instagram. We do all of it.' },
  { q: 'Do I have to film or show my face?', a: 'No. Slideshows are photos and text. No camera, no editing.' },
  { q: 'Do posts go live without me?', a: 'No. You see every slideshow and approve it before it goes out. TikTok asks for this too.' },
  { q: 'How much does it cost?', a: `${price} per slideshow. You add ${minimum} to start, and that is your balance, not a fee. No subscription. No contract.` },
  { q: 'Do I need an account?', a: 'Only an email. We send you a link. The same link signs you up and logs you in.' },
];
