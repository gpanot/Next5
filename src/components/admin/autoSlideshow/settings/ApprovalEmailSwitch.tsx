'use client';

import { useState } from 'react';
import { adminFetch } from '../../business/useAdminApi';
import { Notice, Switch } from './credits/fields';

type Props = { token: string; on: boolean; onChanged: () => void };

const TITLE = 'Daily email to approve posts';

/** The 8 am email on days with posts waiting for approval: they never go out until approved, so it is easy to miss. */
export function ApprovalEmailSwitch({ token, on, onChanged }: Props) {
  const [state, setState] = useState(on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    setBusy(true);
    setError(null);
    setState(next);
    try {
      const saved = await adminFetch<{ approvalEmailEnabled: boolean }>(token, '/api/slideshow/me', { method: 'PATCH', body: JSON.stringify({ approvalEmailEnabled: next }) });
      setState(saved.approvalEmailEnabled);
      onChanged();
    } catch (err) {
      setState(!next);
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink dark:text-zinc-100">{TITLE}</p>
          <p className="text-xs text-muted dark:text-zinc-400">At 8 am, we email you the posts waiting for your OK. They don’t go out until you approve.</p>
        </div>
        <Switch on={state} onChange={(next) => void change(next)} label={TITLE} disabled={busy} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
