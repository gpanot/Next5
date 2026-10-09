'use client';

import { useState } from 'react';
import type { SettingsTab } from '../settings/SettingsModal';
import { isCheckoutReturn } from '../settings/credits/useCheckoutReturn';

/**
 * The workspace's one Settings modal, opened from the sidebar or the phones' Settings tab.
 * Back from Stripe Checkout it opens on Credits so the payment is confirmed.
 */
export const useWorkspaceSettings = () => {
  const [tab, setTab] = useState<SettingsTab | null>(() => (isCheckoutReturn() ? 'credits' : null));
  const close = () => setTab(null);
  return { tab, open: setTab, close };
};

export type WorkspaceSettings = ReturnType<typeof useWorkspaceSettings>;
