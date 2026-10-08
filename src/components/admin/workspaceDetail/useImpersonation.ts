'use client';

import { useCallback, useEffect, useState } from 'react';
import { impersonationUrl } from '../../../lib/impersonation';
import { adminFetch } from '../business/useAdminApi';

type Session = { token: string; email: string; product: string };

/** A user session for the workspace's owner, minted on demand (audited) and reused while the page is open. */
export const useImpersonation = (adminToken: string, workspaceId: string) => {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<Session> => {
    if (session) return session;
    const next = await adminFetch<Session>(adminToken, `/api/admin/workspaces/${workspaceId}/impersonate`, { method: 'POST' });
    setSession(next);
    return next;
  }, [adminToken, workspaceId, session]);

  /** Opens `path` (default: the workspace's home) in a new tab, signed in as the owner. */
  const openAsUser = useCallback(
    (path?: string) => {
      // Opened inside the click, so the popup blocker allows it; the address is set once the session lands.
      const tab = window.open('about:blank', '_blank');
      load()
        .then((s) => {
          const home = s.product === 'slideshow' ? `/slideshow/${workspaceId}` : '/app';
          const url = impersonationUrl(path ?? home, s.token);
          if (tab) tab.location.href = url;
          else window.location.href = url;
        })
        .catch((err: unknown) => {
          tab?.close();
          setError(err instanceof Error ? err.message : 'Could not open as user');
        });
    },
    [load, workspaceId],
  );

  return { session, error, load, openAsUser };
};

/** The owner's session, loaded on mount: for panels that reuse the user's own pages (Analytics). */
export const useUserSession = (adminToken: string, workspaceId: string) => {
  const { session, error, load } = useImpersonation(adminToken, workspaceId);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    load().catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Could not load'));
    // Loads once per workspace; `load` changes when the session lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, workspaceId]);
  return { session, error: error ?? loadError };
};
