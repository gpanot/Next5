'use client';

import Link from 'next/link';
import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import { sessionTokenStore } from '../../../../lib/localStore';
import { SLIDESHOW_HOME, SLIDESHOW_LOGIN, SLIDESHOW_PRICING } from './WorkspaceContext';

/** Top bar of the public pages (home, pricing): Pricing, then Log in, or My workspace when the user is signed in. */
export function PublicTopBar({ page }: { page: 'home' | 'pricing' }) {
  const token = sessionTokenStore.useValue();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-app-line bg-app-bg/90 px-5 backdrop-blur-md sm:px-8">
      <BusinessLogo href={SLIDESHOW_HOME} />
      <span aria-hidden className="hidden h-7 w-px bg-app-line sm:block" />
      <Link href={SLIDESHOW_HOME} className="hidden text-[15px] font-semibold text-app-ink sm:block">Auto Slideshow</Link>
      <nav className="ml-auto flex items-center gap-1 text-sm font-medium sm:gap-2">
        <Link href={SLIDESHOW_PRICING} aria-current={page === 'pricing' ? 'page' : undefined} className="px-2 py-2 text-app-muted transition-colors hover:text-app-ink aria-[current=page]:text-app-ink sm:px-3">
          Pricing
        </Link>
        {token !== undefined && (
          <Link href={SLIDESHOW_LOGIN} className="flex min-h-10 items-center rounded-full border border-app-line px-4 text-app-ink transition-colors hover:bg-app-sunken">
            {token ? 'My workspace' : 'Log in'}
          </Link>
        )}
      </nav>
    </header>
  );
}
