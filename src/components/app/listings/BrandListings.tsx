'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { UrlTabs } from '../../ui/Tabs';
import { LibraryView } from '../library/LibraryView';
import { PropertiesView } from './PropertiesView';

const LISTING_TABS = [
  { value: 'properties', label: 'Properties' },
  { value: 'library', label: 'Library' },
] as const;

/**
 * Realtors' Home: Properties (each home and what was made from it) and Library (everything made) share one page,
 * switched by ?tab=. The old ?tab=listing links land on Properties.
 */
export const BrandListings = () => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get('tab') === 'library' ? 'library' : 'properties';
  // Old links said ?tab=listing; rename it so the Properties tab shows as picked.
  useEffect(() => {
    if (params.get('tab') !== 'listing') return;
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'properties');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, router, pathname]);
  return (
    <>
      <UrlTabs tabs={LISTING_TABS} defaultTab="properties" />
      {tab === 'library' ? <LibraryView /> : <PropertiesView />}
    </>
  );
};
