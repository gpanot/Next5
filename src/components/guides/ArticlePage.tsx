import Link from 'next/link';
import { BLOG_ANCHOR, formatDate, GUIDES_HUB, readMinutes, relatedArticles } from '../../content/guides';
import type { Article } from '../../content/guides/types';
import { PublicFooter } from '../admin/autoSlideshow/workspace/PublicFooter';
import { PublicTopBar } from '../admin/autoSlideshow/workspace/PublicTopBar';
import { ArticleBody } from './ArticleBody';
import { ArticleCard } from './ArticleCard';
import { ArticleCover } from './ArticleCover';
import { ArticleFaq } from './ArticleFaq';
import { articleJsonLd } from './articleJsonLd';
import { ArticleToc } from './ArticleToc';
import { InlineText } from './InlineText';

function Breadcrumbs({ article }: { article: Article }) {
  const section = article.kind === 'guide' ? { label: 'Guides', href: GUIDES_HUB } : { label: 'Blog', href: BLOG_ANCHOR };
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted dark:text-zinc-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link href="/" className="transition-colors hover:text-ink dark:hover:text-zinc-200">Home</Link></li>
        <li aria-hidden>/</li>
        <li><Link href={section.href} className="transition-colors hover:text-ink dark:hover:text-zinc-200">{section.label}</Link></li>
      </ol>
    </nav>
  );
}

function ArticleHeader({ article }: { article: Article }) {
  const updated = article.updated && article.updated !== article.published ? article.updated : null;
  return (
    <header>
      <Breadcrumbs article={article} />
      <h1 className="mt-4 font-display text-[2rem] leading-[1.1] font-bold tracking-tight text-balance text-ink md:text-5xl md:leading-[1.05] dark:text-zinc-100">{article.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted dark:text-zinc-400">{article.excerpt}</p>
      <p className="mt-5 text-sm text-muted dark:text-zinc-500">
        By the Next5 team · <time dateTime={updated ?? article.published}>{updated ? `Updated ${formatDate(updated)}` : formatDate(article.published)}</time> · {readMinutes(article)} min read
      </p>
      {article.answer && <AnswerBox answer={article.answer} />}
      <ArticleCover article={article} sizes="(min-width: 768px) 300px, 60vw" priority className="mt-8 aspect-[16/10] rounded-2xl shadow-sm md:aspect-[16/9]" />
    </header>
  );
}

/** The direct answer to the search, above the fold: readers who only need that get it at once. */
function AnswerBox({ answer }: { answer: string }) {
  return (
    <aside aria-label="Short answer" className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-bold tracking-wide text-blue-700 uppercase dark:text-blue-300">Short answer</p>
      <p className="mt-2 text-[17px] leading-[1.6] text-ink dark:text-zinc-100"><InlineText text={answer} /></p>
    </aside>
  );
}

/** A full guide or blog post page: header, contents, body, questions, more to read, structured data. */
export function ArticlePage({ article }: { article: Article }) {
  const related = relatedArticles(article);
  return (
    <div className="min-h-dvh bg-app-bg">
      <PublicTopBar page="guides" />
      <main className="px-4 pt-8 pb-16 md:px-8 md:pt-12">
        <article className="mx-auto max-w-3xl">
          <ArticleHeader article={article} />
          <ArticleToc blocks={article.blocks} />
          <ArticleBody blocks={article.blocks} source={`${article.kind}/${article.slug}`} />
          {article.faq && article.faq.length > 0 && <ArticleFaq items={article.faq} />}
        </article>
        <section aria-labelledby="keep-reading" className="mx-auto mt-20 max-w-6xl">
          <h2 id="keep-reading" className="text-2xl font-extrabold tracking-tight text-ink dark:text-zinc-100">Keep reading</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => <ArticleCard key={a.slug} article={a} />)}
          </div>
        </section>
      </main>
      <PublicFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd(article) }} />
    </div>
  );
}
