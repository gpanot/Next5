'use client';

import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { SetsList } from '../../../../src/components/app/sets/SetsList';
import { AppLink, useAppRouter } from '../../../../src/components/app/shell/AppLink';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';
import { SkeletonText } from '../../../../src/components/ui/Skeleton';

const AddModelAction = () => (
  <AppLink
    href="/app/sets/new"
    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-app-line bg-app-panel px-3 text-[13px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken"
  >
    <Plus aria-hidden className="h-4 w-4" />
    <span className="hidden sm:inline">Add model</span>
    <span className="sm:hidden">Add</span>
  </AppLink>
);

/** Realtors manage their face in Settings now (compact "Your face" section). */
const BrandSetsRedirect = () => {
  const router = useAppRouter();
  useEffect(() => { router.replace('/app/settings'); }, [router]);
  return <AppPage title="Settings"><SkeletonText lines={3} /></AppPage>;
};

export default function SetsPage() {
  const { product } = useWorkspace();
  if (product === 'brand') return <BrandSetsRedirect />;
  return (
    <AppPage title="Studio Models" actions={<AddModelAction />}>
      <SetsList />
    </AppPage>
  );
}
