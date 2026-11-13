'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ShopCreateFlow } from '../../../../src/components/app/create/ShopCreateFlow';
import { LibraryView } from '../../../../src/components/app/library/LibraryView';
import { PropertiesView } from '../../../../src/components/app/listings/PropertiesView';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';
import { UrlTabs } from '../../../../src/components/ui/Tabs';

const LISTING_TABS = [
  { value: 'properties', label: 'Properties' },
  { value: 'library', label: 'Library' },
] as const;

/**
 * Realtors: Properties (each home and what was made from it) and Library (everything made) share one page,
 * switched by ?tab=. The old ?tab=listing links land on Properties.
 */
const BrandListings = () => {
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

export default function CreatePage() {
  const { product } = useWorkspace();
  return (
    <AppPage title={product === 'brand' ? 'Listings' : 'Create photos'}>
      {product === 'brand' && <BrandListings />}
      {product === 'shop' && <ShopCreateFlow />}
    </AppPage>
  );
}
