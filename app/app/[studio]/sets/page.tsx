'use client';

import { ArchiveRestore, Plus } from 'lucide-react';
import { useState } from 'react';
import { SetsList } from '../../../../src/components/app/sets/SetsList';
import { AppLink } from '../../../../src/components/app/shell/AppLink';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';

const NewInfluencerAction = ({ showArchived, onToggleArchived }: { showArchived: boolean; onToggleArchived: () => void }) => (
  <>
    <button
      type="button"
      onClick={onToggleArchived}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium transition-colors duration-200 ${
        showArchived
          ? 'border-app-accent bg-app-accent-soft text-app-accent'
          : 'border-app-line bg-app-panel text-app-ink hover:bg-app-sunken'
      }`}
    >
      <ArchiveRestore aria-hidden className="h-4 w-4" />
      <span className="hidden sm:inline">{showArchived ? 'Active' : 'Archived'}</span>
    </button>
    {!showArchived && (
      <AppLink
        href="/app/sets/new"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-app-line bg-app-panel px-3 text-[13px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken"
      >
        <Plus aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">New influencer</span>
        <span className="sm:hidden">New</span>
      </AppLink>
    )}
  </>
);

export default function SetsPage() {
  const { product } = useWorkspace();
  const [showArchived, setShowArchived] = useState(false);

  if (product === 'shop') return <AppPage title="Shop looks"><SetsList /></AppPage>;

  const title = showArchived ? 'Archived influencers' : 'Influencers';
  return (
    <AppPage
      title={title}
      actions={<NewInfluencerAction showArchived={showArchived} onToggleArchived={() => setShowArchived((v) => !v)} />}
    >
      <SetsList showArchived={showArchived} />
    </AppPage>
  );
}
