import Image from 'next/image';
import { coverSrc } from '../../content/guides';
import type { Article } from '../../content/guides/types';

/**
 * A 4:5 cover (a Next5 slideshow slide or a generated photo) on a soft blurred copy of itself, so a
 * portrait image fills a landscape card without cropping its hook text.
 */
export function ArticleCover({ article, sizes, priority = false, className = '' }: { article: Pick<Article, 'cover' | 'coverAlt'>; sizes: string; priority?: boolean; className?: string }) {
  const src = coverSrc(article);
  return (
    <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${className}`}>
      <Image src={src} alt="" aria-hidden fill sizes="64px" className="scale-125 object-cover opacity-60 blur-2xl" />
      <div className="absolute inset-y-[8%] left-1/2 aspect-[4/5] -translate-x-1/2 overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10">
        <Image src={src} alt={article.coverAlt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    </div>
  );
}
