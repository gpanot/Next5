import Link from 'next/link';
import { articleHref, formatDate, HUB_LABELS, readMinutes } from '../../content/guides';
import type { Article } from '../../content/guides/types';
import { ArticleCover } from './ArticleCover';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';

/** Topic label and reading time, shared by every card. */
export function ArticleMeta({ article }: { article: Article }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold tracking-wide text-muted uppercase dark:text-zinc-500">
      <span className="text-blue-700 dark:text-blue-300">{article.kind === 'guide' ? 'Guide' : HUB_LABELS[article.hub]}</span>
      <span aria-hidden>·</span>
      <span>{readMinutes(article)} min read</span>
    </p>
  );
}

/**
 * Hub and "keep reading" card: the whole card is one link. On a phone it is a compact row
 * (thumbnail left), from sm up a photo card.
 */
export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={articleHref(article)} className={`group grid grid-cols-[6.5rem_1fr] items-start gap-4 rounded-xl sm:flex sm:flex-col sm:items-stretch sm:gap-0 ${focusRing}`}>
      <ArticleCover article={article} sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 104px" className="aspect-square rounded-xl sm:aspect-[4/3]" />
      <div className="flex flex-col sm:pt-4">
        <ArticleMeta article={article} />
        <h3 className="mt-1.5 font-display text-[1.05rem] leading-snug font-bold tracking-tight text-ink decoration-2 underline-offset-4 group-hover:underline sm:mt-2 sm:text-xl dark:text-zinc-100">{article.title}</h3>
        <p className="mt-2 hidden text-sm leading-relaxed text-muted sm:line-clamp-2 dark:text-zinc-400">{article.excerpt}</p>
        {article.kind === 'blog' && <p className="mt-2 text-xs text-muted sm:mt-3 dark:text-zinc-500">{formatDate(article.published)}</p>}
      </div>
    </Link>
  );
}
