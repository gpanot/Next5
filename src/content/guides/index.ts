import { bestTimeToPostTikTok } from './articles/bestTimeToPostTikTok';
import { chatgptForSocialMedia } from './articles/chatgptForSocialMedia';
import { comingSoonRealEstatePost } from './articles/comingSoonRealEstatePost';
import { facelessTikTokIdeas } from './articles/facelessTikTokIdeas';
import { guideFillCalendar } from './articles/guideFillCalendar';
import { guideFirstSlideshows } from './articles/guideFirstSlideshows';
import { guideReadAnalytics } from './articles/guideReadAnalytics';
import { howToMakeTikTokSlideshow } from './articles/howToMakeTikTokSlideshow';
import { howToSellOnTikTokShop } from './articles/howToSellOnTikTokShop';
import { marketingIdeasSmallBusiness } from './articles/marketingIdeasSmallBusiness';
import { socialMediaContentCalendar } from './articles/socialMediaContentCalendar';
import { socialMediaForGyms } from './articles/socialMediaForGyms';
import { socialMediaForHairSalons } from './articles/socialMediaForHairSalons';
import { socialMediaForRealtors } from './articles/socialMediaForRealtors';
import { socialMediaManagerCost } from './articles/socialMediaManagerCost';
import { socialMediaMarketingSmallBusiness } from './articles/socialMediaMarketingSmallBusiness';
import { tiktokForPlumbers } from './articles/tiktokForPlumbers';
import { tiktokHashtagsForBusiness } from './articles/tiktokHashtagsForBusiness';
import { tiktokHooks } from './articles/tiktokHooks';
import type { Article, ArticleBlock, ArticleKind } from './types';

/** Step-by-step guides to Next5 itself, in reading order. */
export const GUIDES: readonly Article[] = [guideFirstSlideshows, guideFillCalendar, guideReadAnalytics];

/** Blog posts, biggest search demand first (US volumes from treg keyword research, 2026-10-18). */
export const BLOG_POSTS: readonly Article[] = [
  howToMakeTikTokSlideshow,
  socialMediaMarketingSmallBusiness,
  socialMediaContentCalendar,
  bestTimeToPostTikTok,
  tiktokHashtagsForBusiness,
  howToSellOnTikTokShop,
  socialMediaForRealtors,
  comingSoonRealEstatePost,
  marketingIdeasSmallBusiness,
  tiktokHooks,
  socialMediaManagerCost,
  facelessTikTokIdeas,
  chatgptForSocialMedia,
  socialMediaForGyms,
  socialMediaForHairSalons,
  tiktokForPlumbers,
];

export const ALL_ARTICLES: readonly Article[] = [...GUIDES, ...BLOG_POSTS];

export const GUIDES_HUB = '/guides';
export const BLOG_ANCHOR = `${GUIDES_HUB}#blog`;

export const articleHref = ({ kind, slug }: Pick<Article, 'kind' | 'slug'>): string => (kind === 'guide' ? `/guides/${slug}` : `/blog/${slug}`);

export const findArticle = (kind: ArticleKind, slug: string): Article | undefined => ALL_ARTICLES.find((a) => a.kind === kind && a.slug === slug);

const isGeneratedCover = (cover: string): boolean => cover.startsWith('/images/');

export const coverSrc = (article: Pick<Article, 'cover'>): string =>
  isGeneratedCover(article.cover) ? article.cover : `/images/auto-slideshow/${article.cover}/1.jpg`;

/** Pixel size of the cover file: generated covers are 1024x1280, slideshow slides 1080x1350. */
export const coverSize = (article: Pick<Article, 'cover'>): { width: number; height: number } =>
  isGeneratedCover(article.cover) ? { width: 1024, height: 1280 } : { width: 1080, height: 1350 };

const blockText = (block: ArticleBlock): string => {
  switch (block.type) {
    case 'ul':
    case 'ol':
      return block.items.join(' ');
    case 'steps':
      return block.items.map((s) => `${s.title} ${s.text}`).join(' ');
    case 'table':
      return [...block.head, ...block.rows.flat()].join(' ');
    case 'tip':
    case 'cta':
      return `${block.title} ${block.text}`;
    default:
      return block.text;
  }
};

/** Reading time at 200 words a minute, at least 1. */
export const readMinutes = (article: Article): number => {
  const text = [...article.blocks.map(blockText), ...(article.faq ?? []).map((f) => `${f.q} ${f.a}`)].join(' ');
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
};

/** Up to `count` other articles: same hub first, then same kind, then the rest. */
export const relatedArticles = (article: Article, count = 3): Article[] => {
  const others = ALL_ARTICLES.filter((a) => a.slug !== article.slug);
  const rank = (a: Article): number => (a.hub === article.hub ? 0 : a.kind === article.kind ? 1 : 2);
  return [...others].sort((a, b) => rank(a) - rank(b)).slice(0, count);
};

export const formatDate = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
