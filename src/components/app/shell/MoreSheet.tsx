'use client';

import Link from 'next/link';
import { Sheet } from '../../ui/Sheet';
import { StudioSwitcher } from './StudioSwitcher';
import { isActive, type NavItem } from './nav';

type MoreSheetProps = { open: boolean; onClose: () => void; items: NavItem[]; pathname: string };

/** Phone-only overflow menu: every sidebar item that does not fit in the bottom tab bar. */
export const MoreSheet = ({ open, onClose, items, pathname }: MoreSheetProps) => (
  <Sheet open={open} onClose={onClose} title="Menu" side="bottom" className="pb-[env(safe-area-inset-bottom)] lg:hidden">
    <StudioSwitcher compact />
    <nav aria-label="More" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex min-h-14 items-center gap-3 rounded-xl border px-3 text-[14px] transition-colors duration-200',
              active ? 'border-app-accent bg-app-accent-soft font-medium text-app-accent' : 'border-app-line text-app-ink active:bg-app-sunken',
            ].join(' ')}
          >
            <Icon aria-hidden className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  </Sheet>
);
