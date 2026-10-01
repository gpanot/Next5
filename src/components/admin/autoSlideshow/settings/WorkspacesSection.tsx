'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { CreateWorkspaceForm } from '../workspace/CreateWorkspaceForm';

const host = (url: string | null) => url?.replace(/^https?:\/\/(www\.)?/, '') ?? '';
const at = (u: string) => (u.startsWith('@') ? u : `@${u}`);

/** "TikTok @a · Instagram @b", or "No account connected". */
const accountsOf = (w: SlideshowWorkspaceDto) => {
  const parts = [w.tiktokUsername && `TikTok ${at(w.tiktokUsername)}`, w.instagramUsername && `Instagram ${at(w.instagramUsername)}`].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No account connected';
};

type Props = { token: string; currentId: string; onClose: () => void };

/** Every workspace (one per website): open one, or add a new one. */
export function WorkspacesSection({ token, currentId, onClose }: Props) {
  const router = useRouter();
  const { data, error, loading } = useAdminApi<{ workspaces: SlideshowWorkspaceDto[] }>(token, '/api/slideshow/workspaces');
  const [adding, setAdding] = useState(false);
  const open = (id: string) => {
    onClose();
    if (id !== currentId) router.push(`/slideshow/${id}`);
  };

  if (loading && !data) return <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>;
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>;
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted">One workspace per website. Each has its own slideshows, photos, and TikTok and Instagram accounts.</p>
      <ul className="space-y-2">
        {data?.workspaces.map((w) => (
          <li key={w.id}>
            <button onClick={() => open(w.id)} aria-current={w.id === currentId} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:shadow-sm active:scale-[0.99] aria-[current=true]:border-blue-600 aria-[current=true]:ring-1 aria-[current=true]:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-900">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{w.name.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink dark:text-zinc-100">{w.name}</span>
                <span className="block truncate text-xs text-muted">{host(w.websiteUrl)} · {accountsOf(w)}</span>
              </span>
              {w.id === currentId ? <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">Current</span> : <span aria-hidden className="shrink-0 text-muted">›</span>}
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="rounded-xl border border-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-ink dark:text-zinc-100">New workspace</p>
          <CreateWorkspaceForm token={token} compact onCreated={(ws) => open(ws.id)} />
          <button onClick={() => setAdding(false)} className="mt-2 min-h-10 w-full text-sm font-semibold text-muted">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="min-h-12 w-full rounded-full border border-dashed border-line text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">+ New workspace</button>
      )}
    </section>
  );
}
