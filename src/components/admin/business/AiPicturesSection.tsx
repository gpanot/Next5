'use client';

/**
 * AI Pictures section of the Assets Library: still images in the library, newest first, with
 * multi-select delete (poor AI images go, so no future deck picks them) and "Load more".
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';
import { LibrarySelectGrid } from './LibrarySelectGrid';

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

function ImageCard({ asset }: { asset: BlitzAssetDto }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.thumbnailUrl ?? asset.url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <ImagePromptPanel asset={asset} />
    </div>
  );
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

export function AiPicturesSection({ assets, loaded, total, token, addCard, onRemoved, onMore }: Props) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    const last = loaded[loaded.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setError(null);
    try {
      onMore(await fetchMore(token, last.createdAt));
    } catch {
      setError('Could not load more images. Try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const footer = loaded.length < total && (
    <button
      type="button"
      onClick={() => void loadMore()}
      disabled={loadingMore}
      className="mx-auto mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-alt disabled:opacity-50"
    >
      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
      Load more ({total - loaded.length} left)
    </button>
  );

  return (
    <LibrarySelectGrid
      section="aiPictures"
      items={assets}
      token={token}
      gridClassName={GRID}
      addCard={addCard}
      renderItem={(a) => <ImageCard asset={a} />}
      onRemoved={onRemoved}
      footer={footer}
      message={error}
    />
  );
}
