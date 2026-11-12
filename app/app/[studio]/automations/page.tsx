'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CampaignsList } from '../../../../src/components/app/automation/CampaignsList';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';
import { SkeletonText } from '../../../../src/components/ui/Skeleton';

/** Realtors (brand) land straight on "Plan my week"; Shop keeps its campaigns list. */
export default function AutomationsPage() {
  const { product, href } = useWorkspace();
  const router = useRouter();
  useEffect(() => {
    if (product === 'brand') router.replace(href('/automation'));
  }, [product, href, router]);

  if (product !== 'shop') return <SkeletonText lines={6} />;
  return (
    <AppPage title="Campaigns">
      <CampaignsList />
    </AppPage>
  );
}
