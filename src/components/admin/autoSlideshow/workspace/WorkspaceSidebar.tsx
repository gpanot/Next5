'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import { CreditsBadge } from './CreditsBadge';
import { GearIcon } from './navIcons';
import type { WorkspaceSettings } from './useWorkspaceSettings';
import { SLIDESHOW_HOME } from './WorkspaceContext';
import { brandNavItem, creditsNavItem, pageOf, workspaceNavItems, type WorkspaceNavItem } from './workspaceNav';

const itemClass =
  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-app-muted transition-colors duration-200 hover:bg-app-sunken/70 hover:text-app-ink aria-[current=page]:bg-app-accent-soft aria-[current=page]:text-app-accent';

function NavLink({ item, current, children }: { item: WorkspaceNavItem; current: string; children?: ReactNode }) {
  const { id, href, label, Icon } = item;
  return (
    <Link href={href} aria-current={id === current ? 'page' : undefined} className={itemClass}>
      <Icon />
      {label}
      {children}
    </Link>
  );
}

/** Wide screens: the workspace menu on the left. Logo, pages, then Brand, Credits (with the balance) and Settings at the bottom (switch workspace in Settings). */
export function WorkspaceSidebar({ token, workspaceId, settings }: { token: string; workspaceId: string; settings: WorkspaceSettings }) {
  const current = pageOf(usePathname());
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-app-line bg-app-bg px-4 py-6 lg:flex">
      <div className="px-2"><BusinessLogo href={SLIDESHOW_HOME} /></div>
      <nav aria-label="Workspace" className="mt-10 flex flex-col gap-1">
        {workspaceNavItems(workspaceId).map((item) => <NavLink key={item.id} item={item} current={current} />)}
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <NavLink item={brandNavItem(workspaceId)} current={current} />
        <NavLink item={creditsNavItem(workspaceId)} current={current}>
          <CreditsBadge token={token} />
        </NavLink>
        <button type="button" onClick={() => settings.open('accounts')} className={itemClass}>
          <GearIcon />
          Settings
        </button>
      </div>
    </aside>
  );
}
