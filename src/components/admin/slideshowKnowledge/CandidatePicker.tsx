'use client';

import { useState } from 'react';
import type { CandidateDto } from '../../../types/admin/slideshowKnowledge';
import { compact } from './format';

type Props = { candidates: CandidateDto[]; busy: boolean; onImport: (urls: string[]) => void };

/** Found posts, best first. The top ones not yet imported start ticked. */
export function CandidatePicker({ candidates, busy, onImport }: Props) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.filter((c) => !c.imported).slice(0, 5).map((c) => c.url)));
  const toggle = (url: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });

  if (candidates.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">No photo slideshows found. Try another handle or keyword.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {candidates.map((c) => {
          const on = picked.has(c.url);
          return (
            <li key={c.postId}>
              <button
                type="button"
                disabled={c.imported}
                onClick={() => toggle(c.url)}
                aria-pressed={on}
                className={[
                  'relative block w-full overflow-hidden rounded-xl border-2 text-left transition active:scale-[0.98] disabled:opacity-50',
                  on ? 'border-blue-600 dark:border-blue-400' : 'border-transparent',
                ].join(' ')}
              >
                <div className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-800">
                  {c.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-white bg-black/30 text-transparent'}`}>✓</span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] text-white">
                  <p className="font-bold">{compact(c.stats.views)} views · {compact(c.stats.saves)} saves</p>
                  <p className="opacity-80">@{c.creator} · {c.slideCount} slides{c.imported ? ' · imported' : ''}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={busy || picked.size === 0}
        onClick={() => onImport([...picked])}
        className="min-h-11 w-full rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 sm:w-auto dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {busy ? 'Starting…' : `Import ${picked.size} ${picked.size === 1 ? 'post' : 'posts'}`}
      </button>
    </div>
  );
}
