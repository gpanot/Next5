'use client';

/**
 * Makes one `LabClient` available to a whole lab.
 *
 * Every panel, card and hook inside a lab needs to talk to the API. Threading a client through
 * them as a prop would be the same mistake the `token` prop was, one level removed, so the client
 * is read from context instead and the lab's root is the only place that names it.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createAdminLabClient, type LabClient } from './labClient';

const LabClientContext = createContext<LabClient | null>(null);

/** The client for the surrounding lab. Throws when a lab is rendered outside a provider. */
export const useLabClient = (): LabClient => {
  const client = useContext(LabClientContext);
  if (!client) throw new Error('useLabClient must be used inside a <LabClientProvider>.');
  return client;
};

export function LabClientProvider({ client, children }: { client: LabClient; children: ReactNode }) {
  return <LabClientContext.Provider value={client}>{children}</LabClientContext.Provider>;
}

/** Shorthand for the admin tabs, which all have a token and nothing else. */
export function AdminLabClientProvider({ token, children }: { token: string; children: ReactNode }) {
  const client = useMemo(() => createAdminLabClient(token), [token]);
  return <LabClientProvider client={client}>{children}</LabClientProvider>;
}
