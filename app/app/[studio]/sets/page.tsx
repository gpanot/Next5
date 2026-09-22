'use client';

import { Plus } from 'lucide-react';
import { SetsList } from '../../../../src/components/app/sets/SetsList';
import { AppLink } from '../../../../src/components/app/shell/AppLink';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

const NewInfluencerAction = () => (
  <AppLink
    href="/app/sets/new"
    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-app-line bg-app-panel px-3 text-[13px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken"
  >
    <Plus aria-hidden className="h-4 w-4" />
    <span className="hidden sm:inline">New influencer</span>
    <span className="sm:hidden">New</span>
  </AppLink>
);

export default function SetsPage() {
  const { product } = useWorkspace();
  if (product === 'shop') return <AppPage title="Shop looks"><SetsList /></AppPage>;
  return <AppPage title="Influencers" actions={<NewInfluencerAction />}><SetsList /></AppPage>;
}
