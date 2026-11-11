'use client';

import { useEffect } from 'react';

type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } };

/** Keeps the screen on while mounted. A refusal (no support, low battery, hidden tab) is fine: the page still works. */
export const useWakeLock = (): void => {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    (navigator as WakeLockNavigator).wakeLock
      ?.request('screen')
      .then((s) => {
        if (cancelled) void s.release().catch(() => undefined);
        else sentinel = s;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
};
