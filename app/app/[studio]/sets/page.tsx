'use client';

import { Plus } from 'lucide-react';
import { SetsList } from '../../../../src/components/app/sets/SetsList';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { AppLink } from '../../../../src/components/app/shell/AppLink';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

export default function SetsPage() {
  const { product } = useWorkspace();

  if (product === 'brand') {
    return (
      <AppPage
        title="Influencers"
        actions={
          <AppLink
            href="/app/sets/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-app-cta px-4 text-[13px] font-medium text-app-cta-ink transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden className="h-4 w-4" />
            New influencer
          </AppLink>
        }
      >
        <SetsList />
      </AppPage>
    );
  }

  return <AppPage title="Shop looks"><SetsList /></AppPage>;
}
