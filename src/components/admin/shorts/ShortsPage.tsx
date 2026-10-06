'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { videoModelLabel, type ShortDto } from '../../../types/admin/shorts';
import { CreateShortPanel } from './CreateShortPanel';
import { StatusPill } from './StatusPill';
import { seconds, usd, useShortsList } from './useShorts';

function ShortCard({ short: s }: { short: ShortDto }) {
  return (
    <Link href={`/admin/shorts/${s.id}`} className="group block overflow-hidden rounded-xl border border-app-line bg-app-panel shadow-sm transition hover:shadow-md active:scale-[0.99]">
      <div className="relative aspect-[9/16] bg-app-sunken">
        {s.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-app-muted">{s.status === 'FAILED' ? 'No video' : 'Making…'}</div>
        )}
        <div className="absolute top-2 left-2">
          <StatusPill status={s.status} failedStep={s.failedStep} />
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm leading-snug font-bold text-app-ink">{s.hook ?? 'Writing the script…'}</p>
        <p className="truncate text-xs text-app-muted">{s.workspaceName} · {videoModelLabel(s.videoModel)}</p>
        <p className="text-xs font-semibold text-app-ink">
          {usd(s.totalUsdMicros)} · {seconds(s.totalMs)}
          {s.durationS ? ` · ${s.durationS.toFixed(1)} s video` : ''}
        </p>
      </div>
    </Link>
  );
}

function ShortsGrid({ shorts, error }: { shorts: ShortDto[] | null; error: string | null }) {
  if (error && !shorts) return <p className="rounded-xl bg-app-accent-soft p-4 text-sm text-app-danger">{error}</p>;
  if (!shorts) {
    return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="aspect-[9/19] animate-pulse rounded-xl bg-app-sunken" />)}</div>;
  }
  if (shorts.length === 0) {
    return <p className="rounded-xl border border-dashed border-app-line p-10 text-center text-sm text-app-muted">No shorts yet. Create one: pick a workspace and a video model.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {shorts.map((s) => <li key={s.id}><ShortCard short={s} /></li>)}
    </ul>
  );
}

/** Admin › Shorts: every short made, newest first, and the Create button. */
export function ShortsPage({ token }: { token: string }) {
  const router = useRouter();
  const { shorts, error } = useShortsList(token);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin" className="text-xs font-semibold text-app-muted hover:text-app-ink">← Admin</Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-app-ink md:text-3xl">Shorts</h1>
          <p className="text-sm text-app-muted">Brand + bank hook in, a narrated 9:16 video out. Open one to see every prompt, photo, clip, cost and timing.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="min-h-11 rounded-xl bg-app-cta px-5 text-sm font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 active:scale-[0.98]">
          + Create short
        </button>
      </div>
      <ShortsGrid shorts={shorts} error={error} />
      {creating && <CreateShortPanel token={token} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/admin/shorts/${id}`)} />}
    </div>
  );
}
