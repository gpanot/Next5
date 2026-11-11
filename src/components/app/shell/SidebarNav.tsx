'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatShortDate } from '../../../lib/dates';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { StudioSwitcher } from './StudioSwitcher';
import { useWorkspace } from './WorkspaceProvider';
import { isActive, navFor, type NavItem } from './nav';

const NavLink = ({ item, active }: { item: NavItem; active: boolean }) => {
  const { href, label, icon: Icon, primary } = item;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors duration-200',
        active ? 'bg-app-accent-soft font-medium text-app-accent' : primary ? 'text-app-ink hover:bg-app-sunken' : 'text-app-muted hover:bg-app-sunken hover:text-app-ink',
      ].join(' ')}
    >
      <Icon aria-hidden className="h-4.5 w-4.5" />
      {label}
    </Link>
  );
};

export const SidebarNav = () => {
  const pathname = usePathname();
  const { me, product, href } = useWorkspace();
  if (!product) return null;
  const sub = me?.subscription;
  const items = navFor(product);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-app-line bg-app-panel px-4 py-6 lg:flex">
      <div className="px-2"><BusinessLogo /></div>
      <div className="mt-5"><StudioSwitcher /></div>
      <p className="label-caps mt-4 truncate px-2 text-[10px] font-medium text-app-muted">{me?.workspace?.name}</p>
      <nav aria-label="App" className="mt-3 flex flex-col gap-1">
        {items.filter((i) => !i.bottom).map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
      </nav>
      <nav aria-label="Account" className="mt-auto flex flex-col gap-1 pb-3">
        {items.filter((i) => i.bottom).map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
      </nav>
      <div className="rounded-xl bg-app-sunken p-3 text-[13px]">
        <p className="font-medium text-app-ink">{sub ? sub.planName : 'No plan yet'}</p>
        <p className="mt-0.5 text-app-muted">{sub?.endsAt ? `Ends ${formatShortDate(sub.endsAt)}` : 'Pick a plan to keep creating'}</p>
        <Link href={href('/billing')} className="mt-2 inline-block font-medium text-app-accent hover:text-app-ink">{sub ? 'Manage' : 'See plans'}</Link>
      </div>
    </aside>
  );
};
