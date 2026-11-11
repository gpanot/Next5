'use client';

import { useSearchParams } from 'next/navigation';
import { BrandCreateFlow } from '../../../../src/components/app/create/BrandCreateFlow';
import { ShopCreateFlow } from '../../../../src/components/app/create/ShopCreateFlow';
import { LibraryView } from '../../../../src/components/app/library/LibraryView';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';
import { UrlTabs } from '../../../../src/components/ui/Tabs';

const LISTING_TABS = [
  { value: 'listing', label: 'Listing' },
  { value: 'library', label: 'Library' },
] as const;

/** Realtors: Listing (the create flow) and Library (everything made) share one page, switched by ?tab=. */
const BrandListings = () => {
  const tab = useSearchParams().get('tab') === 'library' ? 'library' : 'listing';
  return (
    <>
      <UrlTabs tabs={LISTING_TABS} defaultTab="listing" />
      {tab === 'library' ? <LibraryView /> : <BrandCreateFlow />}
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
