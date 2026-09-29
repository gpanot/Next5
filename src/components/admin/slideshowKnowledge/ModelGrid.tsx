'use client';

import { FORMAT_LABELS, type ModelSummaryDto } from '../../../types/admin/slideshowKnowledge';
import { cardClass, compact, errorClass } from './format';

type Props = { models: ModelSummaryDto[] | null; error: string | null; onOpen: (id: string) => void };

const STATUS_STYLES: Record<ModelSummaryDto['status'], string> = {
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  archived: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function ModelCard({ model: m, onOpen }: { model: ModelSummaryDto; onOpen: (id: string) => void }) {
  return (
    <button onClick={() => onOpen(m.id)} className={`${cardClass} group flex w-full gap-3 overflow-hidden p-3 text-left transition hover:shadow-md active:scale-[0.99]`}>
      <div className="h-28 w-22 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {m.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-tight font-bold text-ink dark:text-zinc-100">{m.name}</p>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[m.status]}`}>{m.status}</span>
        </div>
        <p className="line-clamp-2 font-mono text-[11px] text-muted dark:text-zinc-400">
          {m.pattern.hookPattern}
          {(m.pattern.hookVariants?.length ?? 0) > 0 && <span className="text-blue-600 dark:text-blue-400"> +{m.pattern.hookVariants.length} hooks</span>}
        </p>
        <p className="text-[11px] text-muted">
          {FORMAT_LABELS[m.pattern.format]} · 1 + {m.pattern.itemCount} + 1 slides
        </p>
        <p className="text-[11px] font-semibold text-ink dark:text-zinc-200">
          {m.examples} {m.examples === 1 ? 'example' : 'examples'} · {compact(m.totalViews)} views · {m.savesPerMille}‰ saves
        </p>
        {m.niches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {m.niches.map((n) => <span key={n} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-muted dark:bg-zinc-800">{n}</span>)}
          </div>
        )}
      </div>
    </button>
  );
}

/** Models, most proven first. */
export function ModelGrid({ models, error, onOpen }: Props) {
  if (error && !models) return <p className={errorClass}>{error}</p>;
  if (!models) return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-34 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>;
  if (models.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted dark:border-zinc-800">No models yet. Each imported slideshow becomes a model, or one more example of a model.</p>;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {models.map((m) => <li key={m.id}><ModelCard model={m} onOpen={onOpen} /></li>)}
    </ul>
  );
}
