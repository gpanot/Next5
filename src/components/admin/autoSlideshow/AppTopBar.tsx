'use client';

import { useState } from 'react';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { TikTokAccounts } from './TikTokAccounts';

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
 * Next5 app: the "NEXT5 for business" logo, the page name, and Settings (TikTok accounts) on the right.
 */
export function AppTopBar({ token }: { token: string }) {
  const [settings, setSettings] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-app-line bg-app-bg/90 px-5 backdrop-blur-md sm:px-8">
      <BusinessLogo />
      <span aria-hidden className="h-7 w-px bg-app-line" />
      <span className="text-[15px] font-semibold text-app-ink">Auto Slideshow</span>
      <button onClick={() => setSettings(true)} aria-label="Settings" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-app-muted transition hover:bg-app-line/50 hover:text-app-ink">
        <GearIcon />
      </button>
      {settings && <TikTokAccounts token={token} onClose={() => setSettings(false)} />}
    </header>
  );
}
