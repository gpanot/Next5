import type { ArticleFaq as Faq } from '../../content/guides/types';
import { InlineText } from './InlineText';

/** Questions at the end of a post. Same look as the home FAQ; the FAQPage JSON-LD comes from articleJsonLd. */
export function ArticleFaq({ items }: { items: readonly Faq[] }) {
  return (
    <section aria-labelledby="article-faq" className="mt-14">
      <h2 id="article-faq" className="text-2xl font-extrabold tracking-tight text-ink md:text-[1.75rem] dark:text-zinc-100">Questions</h2>
      <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {items.map(({ q, a }) => (
          <details key={q} className="group p-4 md:p-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink transition-colors hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400">
              {q}
              <span aria-hidden className="text-xl text-muted transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-muted dark:text-zinc-400"><InlineText text={a} /></p>
          </details>
        ))}
      </div>
    </section>
  );
}
