'use client';

import { useCallback, useState } from 'react';
import { createLocalStore } from '../../src/lib/localStore';
import { AdminLogin } from '../../src/components/admin/AdminLogin';
import { BookingsTab } from '../../src/components/admin/BookingsTab';
import { PromptsTab } from '../../src/components/admin/PromptsTab';
import { UsersTab } from '../../src/components/admin/UsersTab';
import { OverviewTab } from '../../src/components/admin/business/OverviewTab';
import { PaymentsTab } from '../../src/components/admin/business/PaymentsTab';
import { PromiseTab } from '../../src/components/admin/business/PromiseTab';
import { QaTab } from '../../src/components/admin/business/QaTab';
import { WorkspacesTab } from '../../src/components/admin/business/WorkspacesTab';
import { ModelTestTab } from '../../src/components/admin/business/ModelTestTab';
import { UgcLabTab } from '../../src/components/admin/business/UgcLabTab';
import { UgcCloneTab } from '../../src/components/admin/business/UgcCloneTab';
import { BlitzLabTab } from '../../src/components/admin/business/BlitzLabTab';
import { BlitzSlideshowTab } from '../../src/components/admin/business/BlitzSlideshowTab';
import { GalleryFacesTab } from '../../src/components/admin/business/GalleryFacesTab';
import { ContentTemplatesTab } from '../../src/components/admin/business/templates/ContentTemplatesTab';
import { CampaignStudioTab } from '../../src/components/admin/business/CampaignStudioTab';
import { HooksTab } from '../../src/components/admin/business/HooksTab';
import { AssetsLibraryTab } from '../../src/components/admin/business/AssetsLibraryTab';

type Tab =
  | 'overview' | 'workspaces' | 'payments' | 'promise' | 'qa' | 'models'
  | 'users' | 'bookings' | 'prompts'
  | 'ugc-lab' | 'ugc-clone' | 'blitz-lab' | 'blitz-slideshow' | 'gallery-faces'
  | 'templates' | 'studio' | 'hooks'
  | 'assets-library';

type NavItem = { id: Tab; label: string; icon: string };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Business',
    items: [
      { id: 'overview',    label: 'Overview',     icon: '◉' },
      { id: 'workspaces',  label: 'Workspaces',   icon: '⊞' },
      { id: 'payments',    label: 'Payments',     icon: '₿' },
      { id: 'promise',     label: 'Promise',      icon: '◈' },
      { id: 'qa',          label: 'QA',           icon: '✓' },
      { id: 'models',      label: 'Models',       icon: '⚙' },
    ],
  },
  {
    title: 'Users',
    items: [
      { id: 'users',    label: 'Users',    icon: '◎' },
      { id: 'bookings', label: 'Bookings', icon: '◷' },
      { id: 'prompts',  label: 'Prompts',  icon: '✦' },
    ],
  },
  {
    title: 'Labs',
    items: [
      { id: 'ugc-lab',        label: 'UGC Lab',        icon: '▶' },
      { id: 'ugc-clone',      label: 'UGC Clone',      icon: '⊕' },
      { id: 'blitz-lab',      label: 'Blitz Lab',      icon: '⚡' },
      { id: 'blitz-slideshow',label: 'Blitz Slideshow',icon: '◫' },
      { id: 'gallery-faces',  label: 'Gallery Faces',  icon: '⊙' },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'templates', label: 'Templates', icon: '☰' },
      { id: 'studio',    label: '🎬 Studio', icon: '' },
      { id: 'hooks',     label: 'Hooks',     icon: '🪝' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { id: 'assets-library', label: 'Assets Library', icon: '◈' },
    ],
  },
];

const adminTokenStore = createLocalStore('admin_token');

const isAdminToken = (token: string): boolean => {
  try {
    return JSON.parse(atob(token.split('.')[1] ?? '')).type === 'admin';
  } catch {
    return false;
  }
};

export default function AdminPage() {
  const stored = adminTokenStore.useValue();
  const token = stored && isAdminToken(stored) ? stored : null;
  const [tab, setTab] = useState<Tab>('overview');

  const logout = useCallback(() => adminTokenStore.set(null), []);
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (stored === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    // h-screen + overflow-hidden on the root locks the viewport — nothing can grow past it.
    <div className="flex h-screen overflow-hidden bg-surface">

      {/* ── Left Sidebar — fixed height, scrolls its own nav ── */}
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-line bg-white">
        {/* Logo — never scrolls */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-5">
          <span className="font-display text-[17px] tracking-[0.12em] text-ink uppercase">Next5</span>
          <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-medium tracking-widest text-white uppercase">
            Admin
          </span>
        </div>

        {/* Nav — scrolls independently */}
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-1 px-5 text-[10px] font-semibold tracking-widest text-muted/70 uppercase">
                {section.title}
              </p>
              {section.items.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={[
                    'flex w-full items-center gap-2.5 px-5 py-2 text-left text-[13px] font-medium transition-colors',
                    tab === id
                      ? 'bg-ink/5 text-ink'
                      : 'text-muted hover:bg-zinc-50 hover:text-ink',
                  ].join(' ')}
                >
                  {icon && (
                    <span className="w-4 shrink-0 text-center text-[13px] leading-none opacity-70">
                      {icon}
                    </span>
                  )}
                  <span>{label}</span>
                  {tab === id && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ink" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Sign out — never scrolls */}
        <div className="shrink-0 border-t border-line px-5 py-4">
          <button
            onClick={logout}
            className="text-[12px] text-muted hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Right column — fixed height, header pinned, content scrolls ── */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">

        {/* Top bar — never scrolls */}
        <header className="flex h-14 shrink-0 items-center border-b border-line bg-white px-8">
          <h1 className="text-[15px] font-semibold text-ink">
            {NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === tab)?.label ?? tab}
          </h1>
        </header>

        {/* Main content — scrolls independently */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {tab === 'overview'         && <OverviewTab          token={token} />}
          {tab === 'workspaces'       && <WorkspacesTab        token={token} />}
          {tab === 'payments'         && <PaymentsTab          token={token} />}
          {tab === 'promise'          && <PromiseTab           token={token} />}
          {tab === 'qa'               && <QaTab                token={token} />}
          {tab === 'models'           && <ModelTestTab         token={token} />}
          {tab === 'users'            && <UsersTab             token={token} />}
          {tab === 'bookings'         && <BookingsTab          token={token} />}
          {tab === 'prompts'          && <PromptsTab           token={token} />}
          {tab === 'ugc-lab'          && <UgcLabTab            token={token} />}
          {tab === 'ugc-clone'        && <UgcCloneTab          token={token} />}
          {tab === 'blitz-lab'        && <BlitzLabTab          token={token} />}
          {tab === 'blitz-slideshow'  && <BlitzSlideshowTab    token={token} />}
          {tab === 'gallery-faces'    && <GalleryFacesTab      token={token} />}
          {tab === 'templates'        && <ContentTemplatesTab  token={token} />}
          {tab === 'studio'           && <CampaignStudioTab    token={token} />}
          {tab === 'hooks'            && <HooksTab             token={token} />}
          {tab === 'assets-library'   && <AssetsLibraryTab     token={token} />}
        </main>
      </div>
    </div>
  );
}
