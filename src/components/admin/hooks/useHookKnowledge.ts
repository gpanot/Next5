'use client';

import { useState } from 'react';
import type { HookKnowledgeDto, HookKnowledgeInput } from '../../../types/admin/hookKnowledge';
import { adminFetch, useAdminApi } from '../business/useAdminApi';

const BASE = '/api/admin/hook-knowledge';

/** The Hook Knowledge entries and their add, edit and delete actions. Each action re-reads the list. */
export const useHookKnowledge = (token: string) => {
  const list = useAdminApi<{ entries: HookKnowledgeDto[] }>(token, BASE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (request: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await request();
      list.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    entries: list.data?.entries ?? null,
    loadError: list.error,
    busy,
    error,
    create: (input: HookKnowledgeInput) => run(() => adminFetch(token, BASE, { method: 'POST', body: JSON.stringify(input) })),
    update: (id: string, input: HookKnowledgeInput) => run(() => adminFetch(token, `${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(input) })),
    remove: (id: string) => run(() => adminFetch(token, `${BASE}/${id}`, { method: 'DELETE' })),
  };
};
