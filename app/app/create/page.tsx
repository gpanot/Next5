'use client';

import { BrandCreateFlow } from '../../../src/components/app/create/BrandCreateFlow';
import { AppPage } from '../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../src/components/app/shell/WorkspaceProvider';

export default function CreatePage() {
  const { product } = useWorkspace();
  return (
    <AppPage title="Create photos">
      {product === 'brand' && <BrandCreateFlow />}
    </AppPage>
  );
}
