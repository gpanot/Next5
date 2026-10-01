'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CreditsPill } from './CreditsPill';
import { isCheckoutReturn } from './settings/credits/useCheckoutReturn';
import { useScrolled } from '../../../hooks/useScrolled';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { SLIDESHOW_HOME, SLIDESHOW_LOGIN } from './workspace/WorkspaceContext';
import { SettingsModal, type SettingsTab } from './settings/SettingsModal';
import { useSlideshowWorkspace } from './workspace/WorkspaceContext';
import { useTopBarSlotRef } from './workspace/TopBarSlot';

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

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

/**
 * Top bar for the standalone Auto Slideshow page, styled like the app shell (/app) so a screen recording reads as the
 * Next5 app: the "NEXT5 for business" logo, the page name, then Pricing, Log in (demo text, like Perfect Ads) and
 * Settings on the right. The admin page has no gear, and Log in leads to the user sign-in (/slideshow/login). With `user` (signed in on /slideshow) the gear opens profile, accounts and photos, and the demo links are gone.
 */
export function AppTopBar({ token, page = 'app', user = false }: { token: string; page?: 'app' | 'pricing'; user?: boolean }) {
  // Back from Stripe Checkout: open Settings on Credits so the payment is confirmed and shown.
  const [settings, setSettings] = useState<SettingsTab | null>(() => (user && isCheckoutReturn() ? 'credits' : null));
  // Bumped when Settings closes, so the credits pill re-reads the balance after a top up or card change.
  const [creditsVersion, setCreditsVersion] = useState(0);
  const closeSettings = () => {
    setSettings(null);
    setCreditsVersion((v) => v + 1);
  };
  const workspace = useSlideshowWorkspace();
  const slotRef = useTopBarSlotRef();
  const scrolled = useScrolled(8);
  return (
    <>
    <header className={`sticky top-0 z-30 flow-root border-b transition-colors duration-300 ${scrolled ? 'border-transparent' : 'border-app-line bg-app-bg/90 backdrop-blur-md'}`}>
      <div className={barClass(scrolled)}>
        <span className={user ? 'hidden sm:block' : undefined}><BusinessLogo href={SLIDESHOW_HOME} /></span>
        <span aria-hidden className="hidden h-7 w-px bg-app-line sm:block" />
        <Link href={user ? SLIDESHOW_HOME : '/admin/auto-slideshow'} className="hidden text-[15px] font-semibold text-app-ink sm:block">Auto Slideshow</Link>
        {user && workspace && (
          <button onClick={() => setSettings('workspaces')} aria-label={`Workspace: ${workspace.name}. Switch workspace`} className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-full border border-app-line px-3 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">
            <span className="truncate">{workspace.name}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-app-muted"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        )}
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium sm:gap-2">
          {!user && <Link
            href="/admin/auto-slideshow/pricing"
            aria-current={page === 'pricing' ? 'page' : undefined}
            className="px-2 py-2 text-app-muted transition-colors hover:text-app-ink aria-[current=page]:text-app-ink sm:px-3"
          >
            Pricing
          </Link>}
          {!user && <Link href={SLIDESHOW_LOGIN} className="rounded-full border border-app-line px-4 py-2 text-app-ink transition-colors hover:bg-app-sunken">Log in</Link>}
        </nav>
        {/* The run's step progress and elapsed time: on its own row on phones and tablets, inline on wide screens */}
        {slotRef && <div ref={slotRef} className="order-last min-w-0 basis-full empty:hidden xl:order-none xl:basis-auto xl:flex-1" />}
        {user && (
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {workspace && <CreditsPill token={token} version={creditsVersion} onOpen={() => setSettings('credits')} />}
            <button onClick={() => setSettings('accounts')} aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full text-app-muted transition hover:bg-app-line/50 hover:text-app-ink">
              <GearIcon />
            </button>
          </div>
        )}
      </div>
    </header>
    {/* Outside the header: its backdrop blur would make it the containing block of the fixed modal. */}
    {user && workspace && settings && <SettingsModal token={token} workspaceId={workspace.id} initialTab={settings} onClose={closeSettings} />}
    </>
  );
}
