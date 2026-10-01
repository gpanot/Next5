'use client';

import type { AssetDto } from '../../../../types/admin/autoSlideshow';

type Props = { asset: AssetDto; broken: boolean; selected: boolean; onToggle: () => void; onBroken: () => void };

/** One photo: tap to select. Shows "Broken" when it was never made or does not load. */
export function AssetTile({ asset, broken, selected, onToggle, onBroken }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} photo ${asset.index + 1}${broken ? ' (broken)' : ''}`}
      className={`relative aspect-[4/5] overflow-hidden rounded-xl border bg-zinc-100 transition active:scale-95 dark:bg-zinc-800 ${selected ? 'border-blue-600 ring-2 ring-blue-600' : 'border-line dark:border-zinc-800'}`}
    >
      {asset.url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.url} alt="" loading="lazy" onError={onBroken} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[11px] font-semibold text-red-600 dark:text-red-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 3 18 18" /></svg>
          Broken
        </span>
      )}
      {asset.usedBy > 0 && <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{asset.usedBy} {asset.usedBy === 1 ? 'slide' : 'slides'}</span>}
      <span aria-hidden className={`absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-white/80 bg-black/30 text-transparent'}`}>✓</span>
    </button>
  );
}
