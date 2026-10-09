'use client';

import Link from 'next/link';
import { useScrolled } from '../../../hooks/useScrolled';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { SLIDESHOW_HOME, SLIDESHOW_LOGIN } from './workspace/WorkspaceContext';

/**
 * Once scrolled, the bar floats as a glass pill, as wide as its content on wide screens (no empty stretches).
 * Same space in the page flow in both states (the pill's negative bottom margin), so the page does not jump.
 */
const barClass = (scrolled: boolean) =>
  [
    'flex flex-wrap items-center gap-x-3 gap-y-2 border transition-all duration-500 ease-out sm:gap-x-4',
    scrolled
      ? 'mx-2 mt-3 -mb-2.5 min-h-[62px] rounded-[32px] border-app-line/70 bg-app-bg/75 py-1 pr-2 pl-4 sm:pl-6 xl:mx-auto xl:w-fit xl:max-w-[calc(100%-2rem)] xl:gap-x-6 shadow-[0_8px_32px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150 sm:mx-4 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]'
      : 'min-h-16 border-transparent px-5 py-2 sm:px-8',
  ].join(' ');

/**
 * Top bar of the admin Auto Slideshow page, styled like the app shell (/app) so a screen recording reads as the Next5
 * app: the "NEXT5 for business" logo, the page name, then Pricing and Log in (demo text, like Perfect Ads; Log in
 * leads to the user sign-in, /slideshow/login). Signed-in users get the workspace menu instead (WorkspaceShell).
 */
export function AppTopBar({ page = 'app' }: { page?: 'app' | 'pricing' }) {
  const scrolled = useScrolled(8);
  return (
    <header className={`sticky top-0 z-30 flow-root border-b transition-colors duration-300 ${scrolled ? 'border-transparent' : 'border-app-line bg-app-bg/90 backdrop-blur-md'}`}>
      <div className={barClass(scrolled)}>
        <BusinessLogo href={SLIDESHOW_HOME} />
        <span aria-hidden className="hidden h-7 w-px bg-app-line sm:block" />
        <Link href="/admin/auto-slideshow" className="hidden text-[15px] font-semibold text-app-ink sm:block">Auto Slideshow</Link>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            href="/admin/auto-slideshow/pricing"
            aria-current={page === 'pricing' ? 'page' : undefined}
            className="px-2 py-2 text-app-muted transition-colors hover:text-app-ink aria-[current=page]:text-app-ink sm:px-3"
          >
            Pricing
          </Link>
          <Link href={SLIDESHOW_LOGIN} className="rounded-full border border-app-line px-4 py-2 text-app-ink transition-colors hover:bg-app-sunken">Log in</Link>
        </nav>
      </div>
    </header>
  );
}
