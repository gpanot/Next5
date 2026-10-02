'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MAX_WORKSPACES, type DeletedWorkspaceDto, type SlideshowWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { CreateWorkspaceForm } from '../workspace/CreateWorkspaceForm';
import { lastWorkspaceStore } from '../workspace/WorkspaceContext';
import { DeletedWorkspaces } from './DeletedWorkspaces';
import { DeleteWorkspaceConfirm } from './DeleteWorkspaceConfirm';

const host = (url: string | null) => url?.replace(/^https?:\/\/(www\.)?/, '') ?? '';
const at = (u: string) => (u.startsWith('@') ? u : `@${u}`);

/** "TikTok @a · Instagram @b", or "No account connected". */
const accountsOf = (w: SlideshowWorkspaceDto) => {
  const parts = [w.tiktokUsername && `TikTok ${at(w.tiktokUsername)}`, w.instagramUsername && `Instagram ${at(w.instagramUsername)}`].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No account connected';
};

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

type Props = { token: string; currentId: string; onClose: () => void };

/** Every workspace (one per website): open one, add a new one (up to MAX_WORKSPACES), delete one (not the last), or restore a deleted one. */
export function WorkspacesSection({ token, currentId, onClose }: Props) {
  const router = useRouter();
  const { data, error, loading, refresh } = useAdminApi<{ workspaces: SlideshowWorkspaceDto[]; deleted: DeletedWorkspaceDto[] }>(token, '/api/slideshow/workspaces');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const open = (id: string) => {
    onClose();
    if (id !== currentId) router.push(`/slideshow/${id}`);
  };
  // Deleting the open workspace moves the user to another one.
  const onDeleted = (id: string) => {
    setDeletingId(null);
    if (id !== currentId) return void refresh();
    const next = data?.workspaces.find((w) => w.id !== id);
    lastWorkspaceStore.set(next?.id ?? null);
    onClose();
    router.replace(next ? `/slideshow/${next.id}` : '/slideshow/login');
  };
  // A new workspace opens straight on its first run.
  const onCreated = (path: string) => {
    onClose();
    router.push(path);
  };
  const canDelete = (data?.workspaces.length ?? 0) > 1;
  const atLimit = (data?.workspaces.length ?? 0) >= MAX_WORKSPACES;

  if (loading && !data) return <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>;
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>;
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted">One workspace per website. Each has its own slideshows, photos, and TikTok and Instagram accounts.</p>
      <ul className="space-y-2">
        {data?.workspaces.map((w) => (
          <li key={w.id} className="space-y-2">
            <div className="flex items-stretch gap-2">
              <button onClick={() => open(w.id)} aria-current={w.id === currentId} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:shadow-sm active:scale-[0.99] aria-[current=true]:border-blue-600 aria-[current=true]:ring-1 aria-[current=true]:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-900">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{w.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink dark:text-zinc-100">{w.name}</span>
                  <span className="block truncate text-xs text-muted">{host(w.websiteUrl)} · {accountsOf(w)}</span>
                </span>
                {w.id === currentId ? <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">Current</span> : <span aria-hidden className="shrink-0 text-muted">›</span>}
              </button>
              {canDelete && (
                <button onClick={() => setDeletingId(deletingId === w.id ? null : w.id)} aria-label={`Delete ${w.name}`} aria-expanded={deletingId === w.id} className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:border-red-300 hover:text-red-600 active:scale-95 aria-expanded:border-red-300 aria-expanded:text-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-red-900 dark:hover:text-red-400">
                  <TrashIcon />
                </button>
              )}
            </div>
            {deletingId === w.id && <DeleteWorkspaceConfirm token={token} workspace={w} onCancel={() => setDeletingId(null)} onDeleted={() => onDeleted(w.id)} />}
          </li>
        ))}
      </ul>
      {atLimit ? (
        <p className="rounded-xl border border-line bg-zinc-50 p-3 text-center text-sm text-muted dark:border-zinc-800 dark:bg-zinc-900">You have {MAX_WORKSPACES} workspaces, the most you can have. Delete one to add a new one.</p>
      ) : adding ? (
        <div className="rounded-xl border border-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-ink dark:text-zinc-100">New workspace</p>
          <CreateWorkspaceForm token={token} compact onCreated={onCreated} />
          <button onClick={() => setAdding(false)} className="mt-2 min-h-10 w-full text-sm font-semibold text-muted">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="min-h-12 w-full rounded-full border border-dashed border-line text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">+ New workspace</button>
      )}
      <DeletedWorkspaces token={token} workspaces={data?.deleted ?? []} onRestored={refresh} />
    </section>
  );
}
