'use client';

import type { PhotoOptionDto } from '../../../../../types/admin/slideshowCampaign';
import { PhotoOptionGrid } from '../PhotoOptionGrid';
import { usePhotoOptions } from '../usePhotoOptions';

type Props = { token: string; campaignId: string; query: string; selected: string | null; onPick: (o: PhotoOptionDto) => void; onClose: () => void };

/** Free stock photos (Unsplash) for the scene text; a tap makes one the background. */
export function StockSearch({ token, campaignId, query, selected, onPick, onClose }: Props) {
  const list = usePhotoOptions(token, campaignId, 'search', query);
  return (
    <section aria-label="Stock backgrounds" className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-white/70">Photos for “{query}”</p>
        <button type="button" onClick={onClose} className="min-h-9 rounded-full px-3 text-sm font-medium text-white/70 transition hover:bg-white/10">Close</button>
      </div>
      {list.error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{list.error}</p>}
      <PhotoOptionGrid options={list.options} loading={list.loading} selected={selected ? [selected] : []} onToggle={onPick} empty="Type a scene, then Search." />
      {list.hasMore && (
        <button type="button" onClick={() => void list.more()} disabled={list.loading} className="min-h-11 w-full rounded-xl border border-white/15 text-sm font-semibold text-white/80 transition active:scale-[0.98] disabled:opacity-50">
          {list.loading ? 'Loading…' : 'More photos'}
        </button>
      )}
    </section>
  );
}
