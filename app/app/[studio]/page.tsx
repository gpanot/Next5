'use client';

import { DashboardView } from '../../../src/components/app/dashboard/DashboardView';
import { BrandListings } from '../../../src/components/app/listings/BrandListings';
import { AppPage } from '../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../src/components/app/shell/WorkspaceProvider';

export default function AppHomePage() {
  const { product } = useWorkspace();
  // Realtors land straight on their properties: no onboarding checklist.
  return (
    <AppPage title="Home" studioSwitcher>
      {product === 'brand' ? <BrandListings /> : <DashboardView />}
    </AppPage>
  );
}
