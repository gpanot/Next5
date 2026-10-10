'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GearIcon } from './navIcons';
import type { WorkspaceSettings } from './useWorkspaceSettings';
import { pageOf, workspaceNavItems } from './workspaceNav';

const tabClass =
  'flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-app-muted outline-none transition-colors active:scale-95 focus-visible:bg-app-sunken aria-[current=page]:text-app-accent';

/**
 * Phones and tablets: the workspace pages and Settings as tabs at the bottom, in thumb reach. Settings holds the
 * workspace switcher, credits and accounts, so there is no top bar. Its height is `--bottom-nav-h` (set by the shell).
 */
export function WorkspaceBottomTabs({ workspaceId, settings }: { workspaceId: string; settings: WorkspaceSettings }) {
  const current = pageOf(usePathname());
  return (
    <nav aria-label="Workspace" className="fixed inset-x-0 bottom-0 z-30 border-t border-app-line bg-app-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-6">
        {workspaceNavItems(workspaceId).map(({ id, href, label, Icon }) => (
          <li key={id}>
            <Link href={href} aria-current={id === current ? 'page' : undefined} className={tabClass}>
              <Icon />
              {label}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => settings.open('accounts')} aria-current={settings.tab ? 'page' : undefined} className={tabClass}>
            <GearIcon />
            Settings
          </button>
        </li>
      </ul>
    </nav>
  );
}
