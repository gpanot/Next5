'use client';

import type { PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';
import { UnsplashCredit } from './UnsplashCredit';

type Props = {
  options: PhotoOptionDto[] | null;
  loading: boolean;
  selected: string[];
  onToggle: (option: PhotoOptionDto) => void;
  empty: string;
  /** Hides the photographer credit on the tiles (the App shot list: the credit shows once the photo is on a slide). */
  hideCredits?: boolean;
  /** Shows a trash button on each tile. */
  onDelete?: (option: PhotoOptionDto) => void;
};

function TrashIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/** Photos of one picker tab as 9:16 tiles; a tap adds or removes it. Picked tiles show their order (the hook rotation). */
export function PhotoOptionGrid({ options, loading, selected, onToggle, empty, hideCredits = false, onDelete }: Props) {
  if (options === null) {
    if (!loading) return <p className="py-10 text-center text-sm text-white/50">{empty}</p>;
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true">
        {Array.from({ length: 12 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-lg bg-white/10" />)}
      </div>
    );
  }
  if (options.length === 0) return <p className="py-10 text-center text-sm text-white/50">Nothing here yet.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {options.map((o) => {
        const order = selected.indexOf(o.key);
        const on = order >= 0;
        return (
          <li key={o.key} className="relative">
            <button
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={on}
              aria-label={o.label}
              className={`relative block aspect-[9/16] w-full overflow-hidden rounded-lg border-2 bg-white/5 transition active:scale-[0.97] ${on ? 'border-emerald-400' : 'border-transparent hover:border-white/30'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className={`absolute top-1.5 right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold transition ${on ? 'bg-emerald-400 text-zinc-950' : 'border border-white/60 bg-black/40 text-transparent'}`}>
                {on ? (selected.length > 1 ? order + 1 : <Check />) : ''}
              </span>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(o)}
                aria-label={`Delete ${o.label}`}
                className="absolute top-1 left-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white/85 backdrop-blur transition hover:bg-red-500/80 hover:text-white active:scale-95"
              >
                <TrashIcon />
              </button>
            )}
            {o.credit && !hideCredits && (
              <UnsplashCredit credit={o.credit} className="absolute inset-x-0 bottom-0 line-clamp-2 rounded-b-lg bg-gradient-to-t from-black/85 to-transparent px-1.5 pt-5 pb-1 text-[10px] leading-snug text-white/90" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
