'use client';

import { useState } from 'react';
import type { DeletedWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { DeletedWorkspaceRow } from './DeletedWorkspaceRow';

type Props = { token: string; workspaces: DeletedWorkspaceDto[]; onChanged: () => void };

/** Workspaces deleted in the last 30 days, each with Restore and Delete forever. Hidden when there are none. */
export function DeletedWorkspaces({ token, workspaces, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (workspaces.length === 0) return null;

  return (
    <section className="space-y-2 border-t border-line pt-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-ink dark:text-zinc-100">Recently deleted</h3>
      <ul className="space-y-2">
        {workspaces.map((w) => (
          <DeletedWorkspaceRow key={w.id} token={token} workspace={w} busy={busy} onBusy={setBusy} onError={setError} onChanged={onChanged} />
        ))}
      </ul>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
