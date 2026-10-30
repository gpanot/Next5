'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ManualDraftDto } from '../../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../../business/useAdminApi';
import { announceCreditsChanged } from '../../creditsEvents';

/** How often a finishing draft is checked. */
const POLL_MS = 4_000;

/** What the wizard is waiting on, so the right button shows its spinner and the others wait. */
export type ManualBusy = 'starting' | 'another' | 'request' | 'text' | 'approve' | 'redo' | 'finish' | 'discard' | null;

type Action =
  | { action: 'another' }
  | { action: 'request'; request: string }
  | { action: 'text'; index: number; title: string; body: string }
  | { action: 'approve' }
  | { action: 'redo'; request: string }
  | { action: 'finish' };

const base = (runId: string) => `/api/admin/auto-slideshow/runs/${runId}/manual`;

/**
 * One hand-made Brand Cast slideshow in the wizard: starts it (or picks up `draftId`), sends each step to the server,
 * and polls while its other photos are made. `start(castId)` begins a new one (also "Make another").
 */
export function useManualDraft(token: string, runId: string, draftId: string | null) {
  const [draft, setDraft] = useState<ManualDraftDto | null>(null);
  const [busy, setBusy] = useState<ManualBusy>(draftId ? 'starting' : null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (kind: Exclude<ManualBusy, null>, call: () => Promise<{ draft: ManualDraftDto }>) => {
    setBusy(kind);
    setError(null);
    try {
      setDraft((await call()).draft);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  // A draft picked up from its card: `busy` starts as 'starting' until it lands.
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    adminFetch<{ draft: ManualDraftDto }>(token, `${base(runId)}/${draftId}`)
      .then(({ draft: loaded }) => !cancelled && setDraft(loaded))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not open this draft'))
      .finally(() => !cancelled && setBusy(null));
    return () => {
      cancelled = true;
    };
  }, [token, runId, draftId]);

  // Finishing runs in the background: check until it is ready (or back on the photo step with its reason).
  const finishing = draft?.stage === 'finishing';
  const id = draft?.id;
  useEffect(() => {
    if (!finishing || !id) return;
    const timer = window.setInterval(() => {
      adminFetch<{ draft: ManualDraftDto }>(token, `${base(runId)}/${id}`)
        .then(({ draft: next }) => {
          setDraft(next);
          if (next.stage === 'ready') announceCreditsChanged();
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [finishing, id, token, runId]);

  const start = (castId: string | null) =>
    run('starting', () => adminFetch(token, base(runId), { method: 'POST', body: JSON.stringify(castId ? { castId } : {}) }));

  const send = (body: Action) => {
    if (!draft) return Promise.resolve(false);
    return run(body.action, () => adminFetch(token, `${base(runId)}/${draft.id}`, { method: 'POST', body: JSON.stringify(body) }));
  };

  const discard = async () => {
    if (!draft) return true;
    setBusy('discard');
    try {
      await adminFetch(token, `${base(runId)}/${draft.id}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this draft');
      return false;
    } finally {
      setBusy(null);
    }
  };

  return { draft, busy, error, start, send, discard, clearError: () => setError(null) };
}

export type ManualDraftState = ReturnType<typeof useManualDraft>;
