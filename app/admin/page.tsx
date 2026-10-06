'use client';

import { useCallback, useState } from 'react';
import { adminTokenStore, useAdminToken } from '../../src/lib/adminToken';
import { AdminLogin } from '../../src/components/admin/AdminLogin';
import { BookingsTab } from '../../src/components/admin/BookingsTab';
import { PromptsTab } from '../../src/components/admin/PromptsTab';
import { UsersTab } from '../../src/components/admin/UsersTab';
import { CreditsTab } from '../../src/components/admin/credits/CreditsTab';
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
import { MetaAdsTab } from '../../src/components/admin/metaAds/MetaAdsTab';
import { SlideshowKnowledgeTab } from '../../src/components/admin/slideshowKnowledge/SlideshowKnowledgeTab';
import { AutoSlideshowTab } from '../../src/components/admin/autoSlideshow/AutoSlideshowTab';
import { ShortsPage } from '../../src/components/admin/shorts/ShortsPage';

type Tab =
  | 'overview' | 'workspaces' | 'payments' | 'promise' | 'qa' | 'models'
  | 'users' | 'credits' | 'bookings' | 'prompts'
  | 'ugc-lab' | 'ugc-clone' | 'blitz-lab' | 'blitz-slideshow' | 'gallery-faces'
  | 'templates' | 'studio' | 'hooks' | 'meta-ads' | 'slideshow-knowledge' | 'auto-slideshow' | 'shorts'
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
      { id: 'credits',  label: 'Credits',  icon: '¢' },
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
      { id: 'meta-ads',  label: 'Perfect Ads',  icon: '▦' },
      { id: 'slideshow-knowledge', label: 'Slideshow Knowledge', icon: '◧' },
      { id: 'auto-slideshow', label: 'Auto Slideshow', icon: '▤' },
      { id: 'shorts', label: 'Shorts', icon: '▶' },
    ],
  },
  {
    title: 'Assets',
    items: [
      { id: 'assets-library', label: 'Assets Library', icon: '◈' },
    ],
  },
];

/** Tabs that also run as a standalone page (opened in a new browser tab). */
const STANDALONE_ROUTES: Partial<Record<Tab, string>> = {
  'meta-ads': '/admin/perfect-ads',
  'slideshow-knowledge': '/admin/slideshow-knowledge',
  'auto-slideshow': '/admin/auto-slideshow',
  shorts: '/admin/shorts',
};

export default function AdminPage() {
  const token = useAdminToken();
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = useCallback(() => adminTokenStore.set(null), []);
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);
  const selectTab = useCallback((id: Tab) => { setTab(id); setSidebarOpen(false); }, []);

  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    // h-dvh + overflow-hidden on the root locks the viewport — nothing can grow past it.
    <div className="flex h-dvh overflow-hidden bg-surface">

      {/* ── Mobile backdrop — closes sidebar on tap outside ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ──
          Mobile: fixed drawer that slides in/out.
          Desktop (lg+): static flex item, always visible.
      ── */}
      <aside className={[
        // Base styles
        'flex h-full shrink-0 flex-col border-r border-line bg-white',
        // Mobile: fixed overlay, 256 px wide, slides via translate
        'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200',
        // Desktop: back to normal flow, narrower, no transform
        'lg:static lg:w-56 lg:translate-x-0 lg:transition-none',
        // Toggle visibility on mobile
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>

        {/* Logo — never scrolls */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-2">
            <span className="font-display text-[17px] tracking-[0.12em] text-ink uppercase">Next5</span>
            <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-medium tracking-widest text-white uppercase">
              Admin
            </span>
          </div>
          {/* Close button — only visible on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-zinc-100 hover:text-ink lg:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
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
                  onClick={() => selectTab(id)}
                  className={[
                    'flex w-full items-center gap-2.5 px-5 py-3 text-left lg:py-2 text-[13px] font-medium transition-colors',
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
        <div className="shrink-0 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4 md:px-8">
          {/* Hamburger — only visible on mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-zinc-100 hover:text-ink lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="truncate text-[15px] font-semibold text-ink">
            {NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === tab)?.label ?? tab}
          </h1>
          {STANDALONE_ROUTES[tab] && (
            <a
              href={STANDALONE_ROUTES[tab]}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:bg-zinc-50 hover:text-ink dark:hover:bg-zinc-800"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
              <span className="hidden sm:inline">Open in new tab</span>
            </a>
          )}
        </header>

        {/* Main content — scrolls independently */}
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8">
          {tab === 'overview'         && <OverviewTab          token={token} />}
          {tab === 'workspaces'       && <WorkspacesTab        token={token} />}
          {tab === 'payments'         && <PaymentsTab          token={token} />}
          {tab === 'promise'          && <PromiseTab           token={token} />}
          {tab === 'qa'               && <QaTab                token={token} />}
          {tab === 'models'           && <ModelTestTab         token={token} />}
          {tab === 'users'            && <UsersTab             token={token} />}
          {tab === 'credits'          && <CreditsTab           token={token} />}
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
          {tab === 'meta-ads'         && <MetaAdsTab           token={token} />}
          {tab === 'slideshow-knowledge' && <SlideshowKnowledgeTab token={token} />}
          {tab === 'auto-slideshow'   && <AutoSlideshowTab     token={token} />}
          {tab === 'shorts'           && <ShortsPage           token={token} />}
          {tab === 'assets-library'   && <AssetsLibraryTab     token={token} />}
        </main>
      </div>
    </div>
  );
}
