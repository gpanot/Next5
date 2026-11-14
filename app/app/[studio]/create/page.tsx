'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ShopCreateFlow } from '../../../../src/components/app/create/ShopCreateFlow';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

export default function CreatePage() {
  const { product } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  // Realtors: the old Listings page is now Home; keep old links working.
  useEffect(() => {
    if (product !== 'brand') return;
    const query = params.toString();
    router.replace(`/app/brand${query ? `?${query}` : ''}`);
  }, [product, params, router]);
  if (product === 'brand') return null;
  return (
    <AppPage title="Create photos">
      {product === 'shop' && <ShopCreateFlow />}
    </AppPage>
  );
}
