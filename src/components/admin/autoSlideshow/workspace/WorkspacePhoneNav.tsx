'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditsPill } from '../CreditsPill';
import { GearIcon } from './navIcons';
import type { WorkspaceSettings } from './useWorkspaceSettings';
import { WorkspaceSwitcher } from './WorkspaceSidebar';
import { pageOf, workspaceNavItems } from './workspaceNav';

/** Phones and tablets: workspace, credits and Settings in one slim row at the top. */
export function WorkspaceMobileBar({ token, settings }: { token: string; settings: WorkspaceSettings }) {
  return (
    <div className="flex min-h-14 items-center gap-2 px-4 py-2 lg:hidden">
      <WorkspaceSwitcher onOpen={() => settings.open('workspaces')} className="mr-auto" />
      <CreditsPill token={token} version={settings.creditsVersion} onOpen={() => settings.open('credits')} />
      <button type="button" onClick={() => settings.open('accounts')} aria-label="Settings" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-muted transition hover:bg-app-line/50 hover:text-app-ink">
        <GearIcon />
      </button>
    </div>
  );
}

/** Phones and tablets: the workspace pages as tabs at the bottom, in thumb reach. Its height is `--bottom-nav-h` (set by the shell). */
export function WorkspaceBottomTabs({ workspaceId }: { workspaceId: string }) {
  const current = pageOf(usePathname());
  return (
    <nav aria-label="Workspace" className="fixed inset-x-0 bottom-0 z-30 border-t border-app-line bg-app-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-4">
        {workspaceNavItems(workspaceId).map(({ id, href, label, Icon }) => (
          <li key={id}>
            <Link
              href={href}
              aria-current={id === current ? 'page' : undefined}
              className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-app-muted transition-colors active:scale-95 aria-[current=page]:text-app-ink"
            >
              <Icon />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
