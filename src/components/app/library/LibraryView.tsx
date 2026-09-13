'use client';

import { CheckSquare, Heart, Images } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FORMAT_IDS, FORMATS } from '../../../config/formats';
import { useToast } from '../../../hooks/useToast';
import { ApiError, apiFetch, downloadUrl, downloadWithAuth } from '../../../lib/apiClient';
import type { BatchItemDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { Select } from '../../ui/Select';
import { SkeletonGrid } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { ResultTile } from '../batches/ResultTile';
import { useWorkspace } from '../shell/WorkspaceProvider';

type LibraryItem = BatchItemDto & { batchId: string; batchName: string };
type Page = { items: LibraryItem[]; nextCursor: string | null };
type State = { key: string; items: LibraryItem[]; nextCursor: string | null; error: string | null; loading: boolean };

export const LibraryView = () => {
  const { product } = useWorkspace();
  const router = useRouter();
  const [format, setFormat] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<LibraryItem | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const key = `${product}|${format}|${favorite}`;

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    const q = new URLSearchParams({ product: product ?? '', ...(format ? { format } : {}), ...(favorite ? { favorite: '1' } : {}), ...(cursor ? { cursor } : {}) });
    try {
      const page = await apiFetch<Page>(`/api/app/library?${q.toString()}`);
      setState((prev) => ({ key, items: append && prev?.key === key ? [...prev.items, ...page.items] : page.items, nextCursor: page.nextCursor, error: null, loading: false }));
    } catch (err) {
      setState((prev) => ({ key, items: prev?.key === key ? prev.items : [], nextCursor: null, error: err instanceof ApiError ? err.message : 'Could not load your library.', loading: false }));
    }
  }, [product, format, favorite, key]);

  useEffect(() => {
    if (product) void load(null, false);
  }, [product, load]);

  const current = state?.key === key ? state : null;
  if (!current) return <SkeletonGrid count={8} cols={4} />;
  if (current.error && current.items.length === 0) return <ErrorState message={current.error} onRetry={() => void load(null, false)} />;

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const favoriteItem = async (item: LibraryItem) => {
    setState((prev) => prev && { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, favorite: !i.favorite } : i)) });
    await apiFetch(`/api/app/batches/${item.batchId}/items/${item.id}`, { method: 'PATCH', json: { favorite: !item.favorite } }).catch(() => toast('Could not update favourite', 'error'));
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44"><Select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)}><option value="">All formats</option>{FORMAT_IDS.map((f) => <option key={f} value={f}>{FORMATS[f].ratio} {FORMATS[f].label}</option>)}</Select></div>
        <AppButton size="sm" variant={favorite ? 'primary' : 'secondary'} iconLeft={<Heart className="h-3.5 w-3.5" />} onClick={() => setFavorite((v) => !v)}>Favourites</AppButton>
        <AppButton size="sm" variant={selecting ? 'primary' : 'secondary'} iconLeft={<CheckSquare className="h-3.5 w-3.5" />} onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }} className="ml-auto">{selecting ? 'Done' : 'Select'}</AppButton>
      </div>
      {current.items.length === 0 ? (
        <EmptyState illustration={<Images className="h-10 w-10" />} title={favorite ? 'No favourites yet' : 'No photos yet'} body={favorite ? 'Tap the heart on photos you love to find them here.' : 'Create your first batch — it takes about 5 minutes.'} />
      ) : (
        <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {current.items.map((item, index) => (
            <ResultTile key={item.id} item={item} alt={`${item.batchName} — photo`} selecting={selecting} selected={selected.has(item.id)} onToggleSelect={() => toggle(item.id)} onOpen={() => setOpen(item)} onFavorite={() => void favoriteItem(item)} onDownload={() => item.url && void downloadUrl(item.url, `next5-${index + 1}.jpg`)} onRedo={() => router.push(`/app/batches/${item.batchId}`)} />
          ))}
        </div>
      )}
      {current.nextCursor && <div className="flex justify-center"><AppButton variant="secondary" onClick={() => void load(current.nextCursor, true)}>Load more</AppButton></div>}
      {selecting && selected.size > 0 && (
        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-panel p-3 shadow-lg lg:bottom-4">
          <span className="text-[14px] font-medium text-app-ink">{selected.size} selected</span>
          <AppButton onClick={() => void downloadWithAuth(`/api/app/library/zip?ids=${[...selected].join(',')}`, 'next5-photos.zip').catch(() => toast('Download failed', 'error'))}>Download selected</AppButton>
        </div>
      )}
      {open?.url && <ImageLightbox src={open.url} alt={`${open.batchName} — photo`} onClose={() => setOpen(null)} overlay={<Link href={`/app/batches/${open.batchId}`} className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#1f1c19]">Open batch</Link>} />}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
