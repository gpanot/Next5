'use client';

import { useEffect } from 'react';

/** Time the page must stay on screen before it counts as an open. Filters out most scanners that load it and leave. */
const ON_SCREEN_MS = 2_000;
const ADMIN_DEVICE_KEY = 'next5-admin-device';

const storageHas = (storage: () => Storage, key: string): boolean => {
  try {
    return storage().getItem(key) !== null;
  } catch {
    return false;
  }
};

const storageSet = (storage: () => Storage, key: string): void => {
  try {
    storage().setItem(key, '1');
  } catch {
    // Private windows may block storage: the open still counts.
  }
};

/** Called by Admin › Prospects, so the admin's own looks at a link in this browser are not counted as the lead's. */
export const markAdminDevice = (): void => storageSet(() => window.localStorage, ADMIN_DEVICE_KEY);

/** Reports one open per tab (a reload is not a new open) once the loaded page has been on screen for a moment. A link
 *  opened in a background tab counts when the lead looks at it. */
export function useProspectOpen(token: string, loaded: boolean): void {
  useEffect(() => {
    if (!loaded || storageHas(() => window.localStorage, ADMIN_DEVICE_KEY)) return;
    const seenKey = `next5-prospect-open:${token}`;
    if (storageHas(() => window.sessionStorage, seenKey)) return;
    let timer: number | undefined;
    const report = () => {
      storageSet(() => window.sessionStorage, seenKey);
      document.removeEventListener('visibilitychange', arm);
      void fetch(`/api/prospect/${encodeURIComponent(token)}/open`, { method: 'POST', keepalive: true }).catch(() => undefined);
    };
    function arm() {
      window.clearTimeout(timer);
      if (document.visibilityState === 'visible') timer = window.setTimeout(report, ON_SCREEN_MS);
    }
    arm();
    document.addEventListener('visibilitychange', arm);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', arm);
    };
  }, [token, loaded]);
}
