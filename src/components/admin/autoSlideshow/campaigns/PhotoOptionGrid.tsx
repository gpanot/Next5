'use client';

import type { PhotoOptionDto } from '../../../../types/admin/slideshowCampaign';

type Props = {
  options: PhotoOptionDto[] | null;
  loading: boolean;
  selected: string[];
  onToggle: (option: PhotoOptionDto) => void;
  empty: string;
};

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/** Photos of one picker tab as 9:16 tiles; a tap adds or removes it. Picked tiles show their order (the hook rotation). */
export function PhotoOptionGrid({ options, loading, selected, onToggle, empty }: Props) {
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
            {o.credit && (
              <a href={o.credit.url} target="_blank" rel="noreferrer" className="absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-[10px] text-white/90 hover:underline">
                {o.credit.name}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
