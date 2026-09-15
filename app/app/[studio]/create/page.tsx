'use client';

import { BrandCreateFlow } from '../../../../src/components/app/create/BrandCreateFlow';
import { ShopCreateFlow } from '../../../../src/components/app/create/ShopCreateFlow';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

export default function CreatePage() {
  const { product } = useWorkspace();
  return (
    <AppPage title="Create photos">
      {product === 'brand' && <BrandCreateFlow />}
      {product === 'shop' && <ShopCreateFlow />}
    </AppPage>
  );
}
