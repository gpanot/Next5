'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspace } from './WorkspaceProvider';
import { isActive, mobileTabsFor } from './nav';

export const BottomTabBar = () => {
  const pathname = usePathname();
  const { product } = useWorkspace();
  if (!product) return null;

  return (
    <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-30 border-t border-app-line bg-app-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {mobileTabsFor(product).map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href) || (label === 'More' && (pathname.startsWith('/app/billing') || pathname.startsWith('/app/settings')));
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200">
                {primary ? (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app-accent text-app-accent-ink shadow-sm"><Icon aria-hidden className="h-5 w-5" /></span>
                ) : (
                  <>
                    <Icon aria-hidden className={`h-5 w-5 ${active ? 'text-app-accent' : 'text-app-muted'}`} />
                    <span className={active ? 'font-medium text-app-accent' : 'text-app-muted'}>{label}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
