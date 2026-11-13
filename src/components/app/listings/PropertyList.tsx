'use client';

import { Home, Loader2, Plus } from 'lucide-react';
import type { ListingDto } from '../../../types/business/listings';

type Props = {
  listings: ListingDto[];
  /** The property open on the right; null while she adds a new one. */
  value: string | null;
  onPick: (listingId: string) => void;
  onNew: () => void;
};

const Cover = ({ listing }: { listing: ListingDto }) => {
  const src = listing.rooms[0]?.url ?? listing.candidates[0]?.thumbUrl ?? null;
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-sunken text-app-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : listing.importStatus === 'fetching' ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Home aria-hidden className="h-4 w-4" />
      )}
    </span>
  );
};

const detailOf = (l: ListingDto): string =>
  l.importStatus === 'fetching' ? 'Getting photos…' : l.importStatus === 'failed' ? 'Import failed' : (l.facts ?? `${l.rooms.length} photo${l.rooms.length === 1 ? '' : 's'}`);

/** Left panel of Listings › Properties: every property she manages, newest first. */
export const PropertyList = ({ listings, value, onPick, onNew }: Props) => (
  <nav aria-label="Properties" className="flex flex-col gap-2 rounded-2xl border border-app-line bg-app-panel p-2 shadow-sm">
    <button
      type="button"
      onClick={onNew}
      aria-pressed={value === null}
      className={`flex h-11 items-center gap-2 rounded-xl px-3 text-[14px] font-medium transition-colors duration-200 ${value === null ? 'bg-app-accent-soft text-app-accent' : 'text-app-ink hover:bg-app-sunken'}`}
    >
      <Plus aria-hidden className="h-4 w-4" /> New property
    </button>
    <ul className="flex flex-col gap-0.5">
      {listings.map((l) => {
        const on = l.id === value;
        return (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onPick(l.id)}
              aria-current={on ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${on ? 'bg-app-accent-soft' : 'hover:bg-app-sunken'}`}
            >
              <Cover listing={l} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[14px] font-medium ${on ? 'text-app-accent' : 'text-app-ink'}`}>{l.label}</span>
                <span className="block truncate text-[12px] text-app-muted">{[l.statusLabel, detailOf(l)].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
