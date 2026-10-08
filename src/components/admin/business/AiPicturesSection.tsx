'use client';

/**
 * AI Pictures section of the Assets Library: still images in the library, newest first, with
 * multi-select delete (poor AI images go, so no future deck picks them) and "Load more".
 */

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, Trash2, X } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';

type DeleteResult = { deleted: string[]; failed: Array<{ id: string; error: string }> };

const GRID = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2';

/** Expandable prompt panel for AI-generated images (no AssetDescriptor — name IS the prompt). */
function ImagePromptPanel({ asset }: { asset: BlitzAssetDto }) {
  const [open, setOpen] = useState(false);
  const isAi = asset.name.includes('[AI]') || asset.source === 'library';

  return (
    <div className="border-t border-line/60">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <span>See Description</span>
        {open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
      </button>
      {open && (
        <div className="bg-surface-alt/60 px-2 pb-2.5 pt-1">
          {isAi && (
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-subtle">Generation prompt</p>
          )}
          <p className="text-[10.5px] text-ink leading-relaxed">{asset.name}</p>
        </div>
      )}
    </div>
  );
}

type CardProps = { asset: BlitzAssetDto; selecting: boolean; selected: boolean; onToggle: () => void };

/** Image card. In select mode, a tap anywhere on the picture toggles it. */
function ImageCard({ asset, selecting, selected, onToggle }: CardProps) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${selected ? 'border-red-500 ring-2 ring-red-500/40' : 'border-line'}`}>
      <button
        type="button"
        onClick={selecting ? onToggle : undefined}
        aria-pressed={selecting ? selected : undefined}
        tabIndex={selecting ? 0 : -1}
        className={`relative aspect-[9/16] w-full overflow-hidden bg-neutral-100 ${selecting ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.thumbnailUrl ?? asset.url} alt="" className={`h-full w-full object-cover transition-opacity ${selected ? 'opacity-70' : ''}`} loading="lazy" />
        {selecting && (
          <span className={`absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors ${selected ? 'border-red-500 bg-red-500 text-white' : 'border-white bg-black/30 text-transparent'}`}>
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <ImagePromptPanel asset={asset} />
    </div>
  );
}

type BarProps = { count: number; total: number; busy: boolean; onAll: () => void; onClear: () => void; onDelete: () => void };

/** Bottom bar while selecting: count, select all / clear, delete with a second tap to confirm. */
function SelectionBar({ count, total, busy, onAll, onClear, onDelete }: BarProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur">
      <span className="text-[13px] font-semibold text-ink tabular-nums">{count} selected</span>
      <button type="button" onClick={count === total ? onClear : onAll} className="text-[12px] font-medium text-muted transition-colors hover:text-ink">
        {count === total ? 'Clear' : `Select all ${total}`}
      </button>
      <button
        type="button"
        disabled={count === 0 || busy}
        onClick={() => (confirming ? (setConfirming(false), onDelete()) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className={`ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-all active:scale-[.97] disabled:opacity-40 ${confirming ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {busy ? 'Deleting…' : confirming ? `Delete ${count}? Tap again` : `Delete ${count}`}
      </button>
    </div>
  );
}

async function postDelete(token: string, ids: string[]): Promise<DeleteResult> {
  const res = await fetch('/api/admin/assets-library/ai-pictures/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const body = (await res.json().catch(() => null)) as (DeleteResult & { message?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.message ?? `HTTP ${res.status}`);
  return body;
}

async function fetchMore(token: string, cursor: string): Promise<BlitzAssetDto[]> {
  const res = await fetch(`/api/admin/assets-library?section=aiPictures&limit=120&cursor=${encodeURIComponent(cursor)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as { assets: BlitzAssetDto[] }).assets;
}

type Props = {
  /** Shown images (already filtered by the search box). */
  assets: BlitzAssetDto[];
  /** All images loaded so far, unfiltered: "Load more" pages after the last one. */
  loaded: BlitzAssetDto[];
  total: number;
  token: string;
  addCard: React.ReactNode;
  onRemoved: (ids: string[]) => void;
  onMore: (assets: BlitzAssetDto[]) => void;
};

/** Selection and delete state for the section. */
function useBulkDelete(token: string, onRemoved: (ids: string[]) => void) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await postDelete(token, [...selected]);
      onRemoved(result.deleted);
      setSelected(new Set(result.failed.map((f) => f.id)));
      const reasons = [...new Set(result.failed.map((f) => f.error))].join(' ');
      setMessage(`${result.deleted.length} deleted.${result.failed.length ? ` ${result.failed.length} kept: ${reasons}` : ''}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Delete failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return { selected, setSelected, toggle, busy, message, setMessage, remove };
}

export function AiPicturesSection({ assets, loaded, total, token, addCard, onRemoved, onMore }: Props) {
  const [selecting, setSelecting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bulk = useBulkDelete(token, onRemoved);

  const stopSelecting = () => {
    setSelecting(false);
    bulk.setSelected(new Set());
    bulk.setMessage(null);
  };

  const loadMore = async () => {
    const last = loaded[loaded.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      onMore(await fetchMore(token, last.createdAt));
    } catch {
      bulk.setMessage('Could not load more images. Try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={selecting ? stopSelecting : () => setSelecting(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:border-red-300 hover:text-red-600"
        >
          {selecting ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {selecting ? 'Done' : 'Select'}
        </button>
        {bulk.message && <p role="status" className="text-[12px] text-muted">{bulk.message}</p>}
      </div>

      <div className={GRID}>
        {!selecting && addCard}
        {assets.map((a) => (
          <ImageCard key={a.id} asset={a} selecting={selecting} selected={bulk.selected.has(a.id)} onToggle={() => bulk.toggle(a.id)} />
        ))}
      </div>

      {loaded.length < total && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mx-auto mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-alt disabled:opacity-50"
        >
          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          Load more ({total - loaded.length} left)
        </button>
      )}

      {selecting && (
        <SelectionBar
          count={bulk.selected.size}
          total={assets.length}
          busy={bulk.busy}
          onAll={() => bulk.setSelected(new Set(assets.map((a) => a.id)))}
          onClear={() => bulk.setSelected(new Set())}
          onDelete={() => void bulk.remove()}
        />
      )}
    </div>
  );
}
