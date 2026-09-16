'use client';

import { Home, Plus } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import type { ListingDto } from '../create/ListingPicker';
import { AppLink as Link } from '../shell/AppLink';

/**
 * Her properties, one tap from photos of her inside them.
 * Opens Create with the property already picked, so there is nothing to choose twice.
 */
export const PropertiesCard = () => {
  const { data } = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const listings = data?.listings ?? [];

  return (
    <section className="rounded-2xl border border-app-line bg-app-panel p-4">
      <h2 className="text-[15px] font-semibold text-app-ink">Your properties</h2>
      <p className="mt-1 text-[13px] text-app-muted">
        Add photos of a listing and we put you inside those real rooms. We never invent a room.
      </p>

      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <li className="shrink-0">
          <Link
            href="/app/create?listing=new"
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-app-line text-app-muted transition-colors duration-200 hover:bg-app-sunken"
          >
            <Plus aria-hidden className="h-5 w-5" />
            <span className="text-[11px]">Property</span>
          </Link>
        </li>
        {listings.map((listing) => {
          const cover = listing.rooms[0]?.url;
          return (
            <li key={listing.id} className="shrink-0">
              <Link href={`/app/create?listing=${listing.id}`} className="flex w-20 flex-col gap-1">
                <span className="relative block h-20 w-20 overflow-hidden rounded-xl bg-app-sunken">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-app-muted"><Home aria-hidden className="h-5 w-5" /></span>
                  )}
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 text-[10px] font-medium tabular-nums text-white">
                    {listing.rooms.length}
                  </span>
                </span>
                <span className="truncate text-[11px] text-app-ink">{listing.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
