import type { ArticleBlock } from '../../content/guides/types';
import { slugify } from '../../content/guides/slugify';

/** "In this article": jump links to every H2. Native <details>, closed on phones so the text starts high, open from md up. */
export function ArticleToc({ blocks }: { blocks: readonly ArticleBlock[] }) {
  const headings = blocks.flatMap((b) => (b.type === 'h2' ? [b.text] : []));
  if (headings.length < 3) return null;
  return (
    <nav aria-label="In this article" className="my-8 rounded-2xl border border-line bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <details className="group md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-ink dark:text-zinc-100">
          In this article
          <span aria-hidden className="text-xl text-muted transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <TocList headings={headings} />
      </details>
      <div className="hidden md:block">
        <p className="font-semibold text-ink dark:text-zinc-100">In this article</p>
        <TocList headings={headings} />
      </div>
    </nav>
  );
}

function TocList({ headings }: { headings: readonly string[] }) {
  return (
    <ol className="mt-3 flex flex-col gap-1 text-[15px]">
      {headings.map((text) => (
        <li key={text}>
          <a href={`#${slugify(text)}`} className="inline-flex min-h-9 items-center text-muted transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400">{text}</a>
        </li>
      ))}
    </ol>
  );
}
