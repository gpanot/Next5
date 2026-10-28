import Image from 'next/image';
import { coverSrc } from '../../content/guides';
import type { Article } from '../../content/guides/types';

/**
 * The cover photo, cropped to fill its box. Covers are 4:5 photos with no text on them, so any
 * crop works; the focus sits a little above center, where faces and hands usually are.
 */
export function ArticleCover({ article, sizes, priority = false, className = '' }: { article: Pick<Article, 'cover' | 'coverAlt'>; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${className}`}>
      <Image
        src={coverSrc(article)}
        alt={article.coverAlt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-[50%_40%] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}
