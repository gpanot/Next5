'use client';

import { useEffect, useState } from 'react';
import { ErrorState } from '../ui/ErrorState';
import { SkeletonText } from '../ui/Skeleton';

/** Signed in: takes the pack (its workspace becomes the user's), then opens it on the Content page. */
export function ClaimRunner({ shareToken, session }: { shareToken: string; session: string }) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/prospect/${encodeURIComponent(shareToken)}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${session}` } })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { workspaceId?: string; message?: string };
        if (!res.ok || !body.workspaceId) throw new Error(body.message ?? 'Could not get your posts. Try again.');
        if (!cancelled) window.location.replace(`/slideshow/${body.workspaceId}/content`);
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not get your posts. Try again.'));
    return () => {
      cancelled = true;
    };
  }, [shareToken, session, attempt]);

  return (
    <div className="mx-auto max-w-md px-4 py-24">
      {error ? (
        <ErrorState message={error} onRetry={() => { setError(null); setAttempt((a) => a + 1); }} />
      ) : (
        <div className="space-y-3 text-center">
          <p className="text-[17px] font-semibold text-app-ink">Getting your posts ready…</p>
          <SkeletonText lines={3} />
        </div>
      )}
    </div>
  );
}
