import Link from 'next/link';
import { articleHref, formatDate } from '../../content/guides';
import type { Article } from '../../content/guides/types';
import { ArticleMeta } from './ArticleCard';
import { ArticleCover } from './ArticleCover';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';

function GuideStep({ article, step }: { article: Article; step: number }) {
  return (
    <li className="snap-start">
      <Link href={articleHref(article)} className={`group block rounded-2xl ${focusRing}`}>
        <div className="relative">
          <ArticleCover article={article} sizes="(min-width: 768px) 360px, 78vw" className="aspect-[4/5] rounded-2xl" />
          <span aria-hidden className="absolute top-3 left-3 flex h-10 min-w-10 items-center justify-center rounded-full bg-white/90 px-3 font-display text-sm font-bold text-ink shadow-sm backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-100">
            {String(step).padStart(2, '0')}
          </span>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-300">Step {step}</p>
        <h3 className="mt-1.5 font-display text-xl leading-snug font-bold tracking-tight text-ink decoration-2 underline-offset-4 group-hover:underline dark:text-zinc-100">{article.title}</h3>
      </Link>
    </li>
  );
}

/** The Next5 guides in reading order: a swipeable row on a phone, three columns from md up. */
export function GuideSteps({ guides }: { guides: readonly Article[] }) {
  return (
    <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 [&>li]:w-[78%] [&>li]:shrink-0 md:[&>li]:w-auto">
      {guides.map((article, i) => <GuideStep key={article.slug} article={article} step={i + 1} />)}
    </ol>
  );
}

/** The first blog post, big: photo and text side by side from md up. */
export function LeadStory({ article }: { article: Article }) {
  return (
    <Link href={articleHref(article)} className={`group grid items-center gap-5 rounded-2xl md:grid-cols-[1.1fr_1fr] md:gap-10 ${focusRing}`}>
      <ArticleCover article={article} sizes="(min-width: 768px) 560px, 92vw" priority className="aspect-[4/3] rounded-2xl md:aspect-[5/4]" />
      <div>
        <ArticleMeta article={article} />
        <h3 className="mt-3 font-display text-[1.75rem] leading-[1.1] font-bold tracking-tight text-balance text-ink decoration-2 underline-offset-4 group-hover:underline md:text-[2.5rem] dark:text-zinc-100">{article.title}</h3>
        <p className="mt-4 text-base leading-relaxed text-muted md:text-lg dark:text-zinc-400">{article.excerpt}</p>
        <p className="mt-5 flex items-center gap-3 text-sm text-muted dark:text-zinc-500">
          <span>{formatDate(article.published)}</span>
          <span aria-hidden className="h-px w-8 bg-line dark:bg-zinc-700" />
          <span className="font-semibold text-ink dark:text-zinc-100">Read the post <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
        </p>
      </div>
    </Link>
  );
}
