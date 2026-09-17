'use client';

import { Check, Home, Loader2 } from 'lucide-react';
import { formatRelative } from '../../../lib/dates';
import type { ListingDto } from '../../../types/business/listings';
import { Sheet } from '../../ui/Sheet';

type Props = {
  listings: ListingDto[];
  value: string | null;
  onPick: (listingId: string) => void;
  onClose: () => void;
};

const Cover = ({ listing }: { listing: ListingDto }) => {
  const src = listing.rooms[0]?.url ?? listing.candidates[0]?.thumbUrl ?? null;
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-app-sunken text-app-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : listing.importStatus === 'fetching' ? (
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
      ) : (
        <Home aria-hidden className="h-5 w-5" />
      )}
    </span>
  );
};

/** Her earlier properties, newest first. Kept out of the main picker: most batches are for one new listing. */
export const RecentPropertiesSheet = ({ listings, value, onPick, onClose }: Props) => (
  <Sheet open onClose={onClose} title="Recent properties">
    <ul className="-mx-2 flex flex-col">
      {listings.map((l) => {
        const picked = l.id === value;
        const detail = l.importStatus === 'fetching' ? 'Getting photos…' : l.importStatus === 'failed' ? 'Import failed' : `${l.rooms.length} photo${l.rooms.length === 1 ? '' : 's'}`;
        return (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onPick(l.id)}
              aria-pressed={picked}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-app-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${picked ? 'bg-app-accent-soft' : ''}`}
            >
              <Cover listing={l} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-app-ink">{l.label}</span>
                <span className="block truncate text-[12px] text-app-muted">
                  {[l.source === 'zillow' ? 'Zillow' : 'Your photos', l.statusLabel, detail, formatRelative(l.createdAt)].filter(Boolean).join(' · ')}
                </span>
              </span>
              {picked && <Check aria-hidden className="h-4 w-4 shrink-0 text-app-accent" />}
            </button>
          </li>
        );
      })}
    </ul>
  </Sheet>
);
