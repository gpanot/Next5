'use client';

import { ProductsView } from '../../../src/components/app/products/ProductsView';
import { AppPage } from '../../../src/components/app/shell/AppShell';

export default function ProductsPage() {
  return <AppPage title="Products"><ProductsView /></AppPage>;
}
