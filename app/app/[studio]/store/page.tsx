'use client';

import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { ShopOnly } from '../../../../src/components/app/shell/ShopOnly';
import { StoreView } from '../../../../src/components/app/store/StoreView';

export default function StorePage() {
  return <AppPage title="Store"><ShopOnly><StoreView /></ShopOnly></AppPage>;
}
