'use client';

import { useState } from 'react';
import { isBusy, type ReferenceDto } from '../../../types/admin/slideshowKnowledge';
import { adminFetch } from '../business/useAdminApi';
import { cardClass, compact, errorClass, usd } from './format';

type Props = { token: string; references: ReferenceDto[] | null; error: string | null; onChanged: () => void; onOpenModel: (id: string) => void };

function StatusPill({ status }: { status: ReferenceDto['status'] }) {
  if (status === 'ready') return <span className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300">Ready</span>;
  if (status === 'failed') return <span className="rounded-md bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700 uppercase dark:bg-red-950 dark:text-red-300">Failed</span>;
  return (
    <span className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 uppercase dark:bg-blue-950 dark:text-blue-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
      {status === 'pending' ? 'Queued' : 'Reading'}
    </span>
  );
}

function Row({ token, reference: r, onChanged, onOpenModel }: { token: string; reference: ReferenceDto; onChanged: () => void; onOpenModel: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (method: 'POST' | 'DELETE') => {
    setBusy(true);
    await adminFetch(token, `/api/admin/slideshow-knowledge/references/${r.id}`, { method }).catch(() => undefined);
    setBusy(false);
    onChanged();
  };
  const hook = r.slides.find((s) => s.role === 'hook') ?? r.slides[0];
  return (
    <li className={`${cardClass} flex items-center gap-3 p-3`}>
      <div className="h-16 w-13 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {hook?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hook.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink dark:text-zinc-100">{hook?.title || r.sourceUrl.replace(/^https?:\/\/(www\.)?/, '')}</p>
        <p className="truncate text-xs text-muted">
          {r.creator ? `@${r.creator} · ` : ''}{compact(r.stats.views)} views · {compact(r.stats.saves)} saves · {r.slides.length} slides{r.costMicros ? ` · ${usd(r.costMicros)}` : ''}
        </p>
        {r.error && <p className="mt-1 line-clamp-2 text-xs text-red-600 dark:text-red-400">{r.error}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusPill status={r.status} />
        {r.status === 'ready' && r.modelId && (
          <button onClick={() => onOpenModel(r.modelId!)} className="min-h-8 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Model →</button>
        )}
        {r.status === 'failed' && (
          <div className="flex gap-3">
            <button disabled={busy} onClick={() => void act('POST')} className="min-h-8 text-xs font-medium text-blue-600 disabled:opacity-40 dark:text-blue-400">Retry</button>
            <button disabled={busy} onClick={() => void act('DELETE')} className="min-h-8 text-xs font-medium text-muted hover:text-red-600 disabled:opacity-40">Remove</button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Recent imports with live status. */
export function ImportList({ token, references, error, onChanged, onOpenModel }: Props) {
  if (error && !references) return <p className={errorClass}>{error}</p>;
  if (!references) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-22 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>;
  if (references.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted dark:border-zinc-800">No posts yet. Paste a TikTok slideshow link above, or find a creator&apos;s best ones.</p>;
  }
  const running = references.filter((r) => isBusy(r.status)).length;
  return (
    <div className="space-y-2">
      {running > 0 && <p className="text-xs text-muted">{running} importing · this page updates by itself</p>}
      <ul className="space-y-2">
        {references.map((r) => <Row key={r.id} token={token} reference={r} onChanged={onChanged} onOpenModel={onOpenModel} />)}
      </ul>
    </div>
  );
}
