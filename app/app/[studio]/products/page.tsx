'use client';

import { ProductsView } from '../../../../src/components/app/products/ProductsView';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { ShopOnly } from '../../../../src/components/app/shell/ShopOnly';

export default function ProductsPage() {
  return <AppPage title="Products"><ShopOnly><ProductsView /></ShopOnly></AppPage>;
}
