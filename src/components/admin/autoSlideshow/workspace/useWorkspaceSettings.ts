'use client';

import { useState } from 'react';
import type { SettingsTab } from '../settings/SettingsModal';
import { isCheckoutReturn } from '../settings/credits/useCheckoutReturn';

/**
 * The workspace's one Settings modal, opened from the sidebar, the phone top bar or the credits pill.
 * Back from Stripe Checkout it opens on Credits so the payment is confirmed. `creditsVersion` bumps on close,
 * so the credits pill re-reads the balance after a top up or card change.
 */
export const useWorkspaceSettings = () => {
  const [tab, setTab] = useState<SettingsTab | null>(() => (isCheckoutReturn() ? 'credits' : null));
  const [creditsVersion, setCreditsVersion] = useState(0);
  const close = () => {
    setTab(null);
    setCreditsVersion((v) => v + 1);
  };
  return { tab, open: setTab, close, creditsVersion };
};

export type WorkspaceSettings = ReturnType<typeof useWorkspaceSettings>;
