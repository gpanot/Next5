'use client';

import { useState } from 'react';
import type { SlideshowMeDto } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { AccountsSection } from './AccountsSection';
import { AssetsSection } from './AssetsSection';
import { ContentSection } from './ContentSection';
import { CreditsSection } from './credits/CreditsSection';
import { ProfileSection } from './ProfileSection';
import { WorkspacesSection } from './WorkspacesSection';

export type SettingsTab = 'workspaces' | 'accounts' | 'content' | 'photos' | 'credits' | 'profile';
type Tab = SettingsTab;
const TABS: { id: Tab; label: string }[] = [
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'content', label: 'Content' },
  { id: 'photos', label: 'Photos' },
  { id: 'credits', label: 'Credits' },
  { id: 'profile', label: 'Profile' },
];

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line px-4 dark:border-zinc-800">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => onChange(t.id)} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold transition ${tab === t.id ? 'border-blue-600 text-ink dark:text-zinc-100' : 'border-transparent text-muted hover:text-ink'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

type Props = { token: string; workspaceId: string; onClose: () => void; initialTab?: Tab };

/**
 * Settings for a signed-in user: their workspaces (switch or add one), the current workspace's TikTok / Instagram
 * accounts, the content mix of calendar ideas, photos (delete broken ones), credits (balance, top up, auto top up, cards), and the profile with log out.
 */
export function SettingsModal({ token, workspaceId, onClose, initialTab = 'workspaces' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { data: me, error, loading, refresh } = useAdminApi<SlideshowMeDto>(token, `/api/slideshow/me?workspace=${workspaceId}`);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()} className="flex h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-xl sm:h-[36rem] sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-center gap-3 p-4 pb-2">
          <h2 className="flex-1 text-base font-extrabold text-ink dark:text-zinc-100">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>
        <Tabs tab={tab} onChange={setTab} />
        <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (tab === 'accounts' || tab === 'profile') && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
          {tab === 'workspaces' && <WorkspacesSection token={token} currentId={workspaceId} onClose={onClose} />}
          {tab === 'content' && <ContentSection token={token} workspaceId={workspaceId} />}
          {tab === 'photos' && <AssetsSection token={token} workspaceId={workspaceId} />}
          {tab === 'credits' && <CreditsSection token={token} workspaceId={workspaceId} />}
          {(tab === 'accounts' || tab === 'profile') && loading && !me && <div className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />}
          {tab === 'profile' && me && <ProfileSection me={me} onClose={onClose} />}
          {tab === 'accounts' && me && <AccountsSection token={token} me={me} onChanged={refresh} />}
        </div>
      </div>
    </div>
  );
}
