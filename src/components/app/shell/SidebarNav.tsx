'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatShortDate } from '../../../lib/dates';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { useWorkspace } from './WorkspaceProvider';
import { isActive, navFor } from './nav';

export const SidebarNav = () => {
  const pathname = usePathname();
  const { me, product } = useWorkspace();
  if (!product) return null;
  const sub = me?.subscription;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-app-line bg-app-panel px-4 py-6 lg:flex">
      <div className="px-2"><BusinessLogo /></div>
      <p className="label-caps mt-6 px-2 text-[10px] font-medium text-app-muted">{product === 'brand' ? 'Brand Studio' : 'Shop Studio'} · {me?.workspace?.name}</p>
      <nav aria-label="App" className="mt-3 flex flex-col gap-1">
        {navFor(product).map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
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
        })}
      </nav>
      <div className="mt-auto rounded-xl bg-app-sunken p-3 text-[13px]">
        <p className="font-medium text-app-ink">{sub ? sub.planName : 'No plan yet'}</p>
        <p className="mt-0.5 text-app-muted">{sub?.endsAt ? `Ends ${formatShortDate(sub.endsAt)}` : 'Pick a plan to keep creating'}</p>
        <Link href="/app/billing" className="mt-2 inline-block font-medium text-app-accent hover:text-app-ink">{sub ? 'Manage' : 'See plans'}</Link>
      </div>
    </aside>
  );
};
