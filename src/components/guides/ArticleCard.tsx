import Link from 'next/link';
import { articleHref, formatDate, readMinutes } from '../../content/guides';
import type { Article } from '../../content/guides/types';
import { ArticleCover } from './ArticleCover';

/** Hub and "keep reading" card: the whole card is one link. */
export function ArticleCard({ article }: { article: Article }) {
  const isGuide = article.kind === 'guide';
  return (
    <Link
      href={articleHref(article)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <ArticleCover article={article} sizes="(min-width: 1024px) 180px, 40vw" className="aspect-[16/9] sm:aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-muted dark:text-zinc-500">
          {isGuide ? 'Guide' : formatDate(article.published)} · {readMinutes(article)} min read
        </p>
        <h3 className="mt-2 text-lg leading-snug font-bold tracking-tight text-ink transition-colors group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">{article.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted dark:text-zinc-400">{article.excerpt}</p>
        <p className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
          {isGuide ? 'Read the guide' : 'Read the post'} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </p>
      </div>
    </Link>
  );
}
