import { BLOG_POSTS, GUIDES } from '../../content/guides';
import type { Article } from '../../content/guides/types';
import { PublicFooter } from '../admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../admin/autoSlideshow/workspace/PublicTopBar';
import { ArticleCard } from './ArticleCard';

function HubSection({ id, title, intro, articles }: { id: string; title: string; intro: string; articles: readonly Article[] }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl dark:text-zinc-100">{title}</h2>
          <p className="mt-2 text-muted dark:text-zinc-400">{intro}</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-muted dark:bg-zinc-800 dark:text-zinc-400">{articles.length}</span>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
      </div>
    </section>
  );
}

const jumpClass = 'inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink shadow-sm transition hover:border-ink dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500';

/** /guides: step-by-step guides to Next5, then the blog on TikTok and Instagram marketing for small businesses. */
export function GuidesHub() {
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar page="guides" />
      <main className="px-4 pt-10 pb-16 md:px-8 md:pt-16">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold tracking-wide text-blue-700 uppercase dark:text-blue-300">Resources</p>
          <h1 className="mt-3 text-[2.25rem] leading-[1.05] font-extrabold tracking-tight text-balance text-ink md:text-6xl dark:text-zinc-100">Guides and blog</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted dark:text-zinc-400">Simple, step-by-step help to get more customers from TikTok and Instagram. Made for small businesses.</p>
          <nav aria-label="Sections" className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="#guides" className={jumpClass}>Guides · {GUIDES.length}</a>
            <a href="#blog" className={jumpClass}>Blog · {BLOG_POSTS.length}</a>
          </nav>
        </header>
        <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-16 md:mt-20 md:gap-20">
          <HubSection id="guides" title="Guides" intro="How to use Next5, step by step." articles={GUIDES} />
          <HubSection id="blog" title="Blog" intro="TikTok and Instagram marketing for small businesses, in plain words." articles={BLOG_POSTS} />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
