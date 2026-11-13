'use client';

import { ChevronLeft } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import type { ListingDto } from '../../../types/business/listings';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard } from '../../ui/Skeleton';
import { BrandCreateFlow } from '../create/BrandCreateFlow';
import { PropertyList } from './PropertyList';

const NEW = 'new';

/** ?listing= drives the page, so the back button and shared links land on the same property. */
const useListingParam = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = useCallback(
    (value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set('listing', value);
      else next.delete('listing');
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, params],
  );
  return { value: params.get('listing'), set };
};

/**
 * Listings › Properties: her properties on the left, the open one's videos and photos on the right.
 * On a phone the list and the property are two screens; ?listing= picks which one shows.
 */
export const PropertiesView = () => {
  const { data, error, loading, refresh } = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const { value: param, set } = useListingParam();
  const listings = data?.listings ?? [];

  if (loading && !data) {
    return (
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SkeletonCard />
        <div className="hidden flex-col gap-4 lg:flex"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;

  // No property yet: just the add form, full width.
  if (listings.length === 0) {
    return <BrandCreateFlow listings={[]} onRefresh={refresh} listingId={null} onSelect={(id) => set(id ?? NEW)} />;
  }

  const picked = param === NEW ? null : param ?? listings[0]!.id;
  // Phones show the list until she opens a property (or "New property").
  const detailOpen = param !== null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className={`lg:sticky lg:top-20 ${detailOpen ? 'hidden lg:block' : ''}`}>
        <PropertyList listings={listings} value={picked} onPick={set} onNew={() => set(NEW)} />
      </div>
      <div className={`min-w-0 flex-col gap-3 ${detailOpen ? 'flex' : 'hidden lg:flex'}`}>
        <button
          type="button"
          onClick={() => set(null)}
          className="flex h-9 w-fit items-center gap-1 rounded-lg pr-2 text-[14px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink lg:hidden"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" /> All properties
        </button>
        <BrandCreateFlow listings={listings} onRefresh={refresh} listingId={picked} onSelect={(id) => set(id ?? NEW)} />
      </div>
    </div>
  );
};
