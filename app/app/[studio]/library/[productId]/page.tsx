'use client';

import { use } from 'react';
import { AppPage } from '../../../../../src/components/app/shell/AppShell';
import { ShopOnly } from '../../../../../src/components/app/shell/ShopOnly';
import { ListingPackView } from '../../../../../src/components/app/tiktokLibrary/ListingPackView';

export default function ListingPackPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  return <AppPage title="Listing pack"><ShopOnly><ListingPackView productId={productId} /></ShopOnly></AppPage>;
}
