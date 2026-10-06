'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { useLabClient } from '../../LabClientProvider';

const LABEL = { tiktok: 'TikTok', youtube: 'YouTube' } as const;

/**
 * TikTok or YouTube not connected yet: connect it right here. Same sign-in as Settings → Accounts; the platform sends
 * the browser back to the workspace once approved. Only a workspace client can start it (it names the workspace).
 */
export function ConnectTikTok({ provider = 'tiktok' }: { provider?: keyof typeof LABEL }) {
  const label = LABEL[provider];
  const client = useLabClient();
  const headers = client.authHeaders();
  const workspaceId = headers['X-Workspace-Id'];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/app/integrations/${provider}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, returnTo: 'slideshow' }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!res.ok || !data.url) throw new Error(data.message ?? `Could not open ${label}. Try again.`);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not open ${label}. Try again.`);
      setBusy(false);
    }
  };

  if (!workspaceId) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">Connect your {label} account first: Settings → Accounts.</p>;
  }
  return (
    <div className="space-y-2 rounded-xl border border-[var(--line,#e8e5e1)] p-3 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-neutral-100 text-[var(--ink,#000)] dark:bg-neutral-800 dark:text-neutral-100">
          <PlatformIcon id={provider} className="h-5 w-5" />
        </span>
        <p className="min-w-0 flex-1 text-[13px] text-[var(--mute,#7c7d82)]">
          <b className="block font-semibold text-[var(--ink,#000)] dark:text-neutral-100">Connect {label} to post</b>
          So we can post this video for you.
        </p>
        <button type="button" onClick={() => void connect()} disabled={busy} className="flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-[var(--ink,#000)] px-4 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-white dark:text-black">
          {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
          {busy ? 'Opening…' : 'Connect'}
        </button>
      </div>
      {error && <p role="alert" className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
