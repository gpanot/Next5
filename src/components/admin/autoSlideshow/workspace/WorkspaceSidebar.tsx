'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import { CreditsPill } from '../CreditsPill';
import { ChevronDownIcon, GearIcon } from './navIcons';
import type { WorkspaceSettings } from './useWorkspaceSettings';
import { SLIDESHOW_HOME, useSlideshowWorkspace } from './WorkspaceContext';
import { pageOf, workspaceNavItems } from './workspaceNav';

const itemClass =
  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-app-muted transition-colors duration-200 hover:bg-app-sunken/70 hover:text-app-ink aria-[current=page]:bg-app-accent-soft aria-[current=page]:text-app-accent';

/** The workspace name; opens Settings › Workspaces to switch or add one. A grey block until the workspace loads. */
export function WorkspaceSwitcher({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  const workspace = useSlideshowWorkspace();
  if (!workspace) return <span aria-hidden className={`h-10 w-32 animate-pulse rounded-full bg-app-line/60 ${className}`} />;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Workspace: ${workspace.name}. Switch workspace`}
      className={`flex min-h-10 min-w-0 items-center gap-1.5 rounded-full border border-app-line px-3 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95 ${className}`}
    >
      <span className="truncate">{workspace.name}</span>
      <ChevronDownIcon />
    </button>
  );
}

/** Wide screens: the workspace menu on the left. Logo, pages, then credits and Settings at the bottom (switch workspace in Settings). */
export function WorkspaceSidebar({ token, workspaceId, settings }: { token: string; workspaceId: string; settings: WorkspaceSettings }) {
  const current = pageOf(usePathname());
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-app-line bg-app-bg px-4 py-6 lg:flex">
      <div className="px-2"><BusinessLogo href={SLIDESHOW_HOME} /></div>
      <nav aria-label="Workspace" className="mt-10 flex flex-col gap-1">
        {workspaceNavItems(workspaceId).map(({ id, href, label, Icon }) => (
          <Link key={id} href={href} aria-current={id === current ? 'page' : undefined} className={itemClass}>
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <CreditsPill token={token} version={settings.creditsVersion} onOpen={() => settings.open('credits')} />
        <button type="button" onClick={() => settings.open('accounts')} className={itemClass}>
          <GearIcon />
          Settings
        </button>
      </div>
    </aside>
  );
}
