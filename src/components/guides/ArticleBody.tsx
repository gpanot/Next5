import type { ArticleBlock } from '../../content/guides/types';
import { slugify } from '../../content/guides/slugify';
import { ArticleCta } from './ArticleCta';
import { InlineText } from './InlineText';

const pClass = 'my-4 text-[17px] leading-[1.7] text-zinc-700 dark:text-zinc-300';
const h2Class = 'mt-12 mb-3 scroll-mt-24 text-2xl font-extrabold tracking-tight text-ink md:text-[1.75rem] dark:text-zinc-100';
const h3Class = 'mt-8 mb-2 scroll-mt-24 text-xl font-bold tracking-tight text-ink dark:text-zinc-100';
const listClass = 'my-4 flex flex-col gap-2 pl-6 text-[17px] leading-[1.7] text-zinc-700 marker:text-blue-600 dark:text-zinc-300 dark:marker:text-blue-400';

function Steps({ items }: { items: Extract<ArticleBlock, { type: 'steps' }>['items'] }) {
  return (
    <ol className="my-6 flex flex-col gap-3">
      {items.map((step, i) => (
        <li key={step.title} className="flex gap-4 rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white dark:bg-blue-500">{i + 1}</span>
          <div>
            <p className="font-semibold text-ink dark:text-zinc-100">{step.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300"><InlineText text={step.text} /></p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Table({ head, rows }: Extract<ArticleBlock, { type: 'table' }>) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-line shadow-sm dark:border-zinc-800">
      <table className={`w-full border-collapse text-left text-sm md:text-[15px] ${head.length > 3 ? 'min-w-[32rem]' : ''}`}>
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>{head.map((cell) => <th key={cell} scope="col" className="px-3 py-3 font-semibold text-ink md:px-4 dark:text-zinc-100">{cell}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {rows.map((row) => (
            <tr key={row.join('|')}>{row.map((cell, i) => <td key={i} className="px-3 py-3 align-top text-zinc-700 md:px-4 dark:text-zinc-300"><InlineText text={cell} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'p':
      return <p className={pClass}><InlineText text={block.text} /></p>;
    case 'h2':
      return <h2 id={slugify(block.text)} className={h2Class}>{block.text}</h2>;
    case 'h3':
      return <h3 id={slugify(block.text)} className={h3Class}>{block.text}</h3>;
    case 'ul':
      return <ul className={`${listClass} list-disc`}>{block.items.map((item) => <li key={item}><InlineText text={item} /></li>)}</ul>;
    case 'ol':
      return <ol className={`${listClass} list-decimal`}>{block.items.map((item) => <li key={item}><InlineText text={item} /></li>)}</ol>;
    case 'steps':
      return <Steps items={block.items} />;
    case 'table':
      return <Table {...block} />;
    case 'tip':
      return (
        <aside className="my-6 rounded-xl border-l-4 border-blue-600 bg-zinc-50 px-5 py-4 dark:border-blue-400 dark:bg-zinc-900">
          <p className="font-semibold text-ink dark:text-zinc-100">{block.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300"><InlineText text={block.text} /></p>
        </aside>
      );
    case 'cta':
      return <ArticleCta title={block.title} text={block.text} />;
  }
}

/** The body of a guide or blog post, block by block. H2 and H3 get ids for the table of contents. */
export function ArticleBody({ blocks }: { blocks: readonly ArticleBlock[] }) {
  return <div>{blocks.map((block, i) => <Block key={i} block={block} />)}</div>;
}
