import { FREE_GRANT_CENTS } from '../../../../types/admin/slideshowCredits';
import { MIN_DEPOSIT_CENTS, PRICE_CENTS, PRICE_LABEL, shortMoney } from '../pricing/pricing';

const price = PRICE_LABEL;
const minimum = shortMoney(MIN_DEPOSIT_CENTS);
const freePosts = Math.floor(FREE_GRANT_CENTS / PRICE_CENTS);
const freeLine = freePosts === 1 ? 'Your first post is free.' : `Your first ${freePosts} posts are free.`;

/** Questions on the public Auto Slideshow home. Plain words, only claims a buyer can check. Also feeds the FAQPage JSON-LD. */
export const HOME_FAQ: { q: string; a: string }[] = [
  { q: 'What is Next5?', a: 'You paste your website. We make TikTok slideshows, short videos and Shorts for your business. Each one has a hook, a caption and hashtags. You approve it, and we post it.' },
  { q: 'What do I get?', a: 'More leads, enquiries, bookings or sales. You pick the goal. We make posts built to get it.' },
  { q: 'Why do these posts work?', a: 'Each one copies a hook and a format that already pull views in your market. We only use formats from our approved list. No guessing.' },
  { q: 'Can I plan my whole month?', a: 'Yes. Your posts land on a 30-day calendar. Swipe through ideas, keep the ones you like, and we make them.' },
  { q: 'How do I know what works?', a: 'Your Analytics page shows views, likes, comments and shares for each post. It shows which hooks beat your usual post, so you make more of them.' },
  { q: 'Where do you post?', a: 'TikTok today. Instagram and YouTube Shorts are next. Connect each account once.' },
  { q: 'Can’t I just use ChatGPT?', a: 'ChatGPT writes words. It does not find hooks that win in your market, make the photos and videos, fill your calendar, post for you or show your numbers. We do all of it.' },
  { q: 'Do I have to film or show my face?', a: 'No. We make the photos and videos for you. No camera, no editing.' },
  { q: 'Do posts go live without me?', a: 'No. You see every post and approve it before it goes out.' },
  { q: 'How much does it cost?', a: `${price} per slideshow or video. ${freeLine} Then add ${minimum} to start. That is your balance, not a fee. No subscription. No contract.` },
  { q: 'Do I need an account?', a: 'Only an email. We send you a link. The same link signs you up and logs you in.' },
];
