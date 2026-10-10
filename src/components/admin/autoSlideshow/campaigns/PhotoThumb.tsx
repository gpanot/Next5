'use client';

import type { CampaignCredit } from '../../../../types/admin/slideshowCampaign';

type Props = { url: string | null; number?: number; credit: CampaignCredit | null; onRemove?: () => void };

/** One attached photo, 9:16, with its rotation number, its Unsplash credit and a remove button. */
export function PhotoThumb({ url, number, credit, onRemove }: Props) {
  return (
    <div className="relative h-28 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
      {number !== undefined && <span className="absolute top-1 left-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">{number}</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove photo" className="absolute top-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white transition hover:bg-black/80">✕</button>
      )}
      {credit && (
        <a href={credit.url} target="_blank" rel="noreferrer" title={`Photo by ${credit.name} on Unsplash`} className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white/90">
          {credit.name}
        </a>
      )}
    </div>
  );
}
