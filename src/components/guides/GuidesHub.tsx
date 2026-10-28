import type { ReactNode } from 'react';
import { BLOG_POSTS, GUIDES } from '../../content/guides';
import { PublicFooter } from '../admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../admin/autoSlideshow/workspace/PublicTopBar';
import { ArticleCard } from './ArticleCard';
import { GuideSteps, LeadStory } from './HubFeatures';

function SectionHead({ id, index, title, intro, count }: { id: string; index: string; title: string; intro: string; count: number }) {
  return (
    <div className="flex items-end justify-between gap-6 border-t-2 border-ink pt-4 dark:border-zinc-100">
      <div>
        <p className="font-display text-sm font-bold text-muted dark:text-zinc-500">{index}</p>
        <h2 id={`${id}-title`} className="mt-1 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl dark:text-zinc-100">{title}</h2>
        <p className="mt-2 max-w-xl text-muted dark:text-zinc-400">{intro}</p>
      </div>
      <p className="shrink-0 pb-1 text-sm text-muted tabular-nums dark:text-zinc-500">{count} {count === 1 ? 'article' : 'articles'}</p>
    </div>
  );
}

function HubSection({ id, children }: { id: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">{children}</section>;
}

const jumpClass = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink shadow-sm transition hover:border-ink dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500';

function Masthead() {
  return (
    <header className="mx-auto max-w-6xl">
      <p className="text-xs font-bold tracking-[0.18em] text-blue-700 uppercase dark:text-blue-300">Resources for small businesses</p>
      <h1 className="mt-4 max-w-4xl font-display text-[2.75rem] leading-[0.98] font-bold tracking-tight text-balance text-ink md:text-7xl dark:text-zinc-100">
        Guides and blog
      </h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="max-w-xl text-lg leading-relaxed text-muted md:text-xl dark:text-zinc-400">Simple, step-by-step help to get more customers from TikTok and Instagram. No jargon, no fluff.</p>
        <nav aria-label="Sections" className="flex flex-wrap gap-3">
          <a href="#guides" className={jumpClass}>Guides <span className="text-muted tabular-nums dark:text-zinc-500">{GUIDES.length}</span></a>
          <a href="#blog" className={jumpClass}>Blog <span className="text-muted tabular-nums dark:text-zinc-500">{BLOG_POSTS.length}</span></a>
        </nav>
      </div>
    </header>
  );
}

/** /guides: step-by-step guides to Next5, then the blog on TikTok and Instagram marketing for small businesses. */
export function GuidesHub() {
  const [lead, ...posts] = BLOG_POSTS;
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar page="guides" />
      <main className="px-4 pt-10 pb-20 md:px-8 md:pt-16">
        <Masthead />
        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-16 md:mt-16 md:gap-24">
          <HubSection id="guides">
            <SectionHead id="guides" index="01" title="Start here" intro="How to use Next5, in three short guides. Read them in order." count={GUIDES.length} />
            <div className="mt-8"><GuideSteps guides={GUIDES} /></div>
          </HubSection>
          <HubSection id="blog">
            <SectionHead id="blog" index="02" title="Blog" intro="TikTok and Instagram marketing for small businesses, in plain words." count={BLOG_POSTS.length} />
            {lead && <div className="mt-8"><LeadStory article={lead} /></div>}
            <div className="mt-12 grid gap-6 border-t border-line pt-10 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 dark:border-zinc-800">
              {posts.map((article) => <ArticleCard key={article.slug} article={article} />)}
            </div>
          </HubSection>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
