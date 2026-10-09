'use client';

import { useState } from 'react';
import type { TikTokAccountDto } from '../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../business/useAdminApi';

type Props = { token: string; onClose: () => void };

/** Result of the TikTok sign-in, read from the URL the callback lands on (/admin/auto-slideshow?connected=tiktok). */
export const tiktokReturn = (): { ok: boolean; message: string } | null => {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get('connected') === 'tiktok') return { ok: true, message: 'TikTok account connected.' };
  const err = q.get('integration_error');
  return err ? { ok: false, message: err } : null;
};

function Row({ token, account: a, onChanged }: { token: string; account: TikTokAccountDto; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await adminFetch<{ url: string }>(token, `/api/admin/auto-slideshow/tiktok-accounts/${a.workspaceId}`, { method: 'POST', body: '{}' });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
      setBusy(false);
    }
  };
  const disconnect = async () => {
    if (!window.confirm(`Disconnect @${a.username ?? 'TikTok'} from ${a.workspaceName}? Scheduled posts for it will fail.`)) return;
    setBusy(true);
    await adminFetch(token, `/api/admin/auto-slideshow/tiktok-accounts/${a.workspaceId}`, { method: 'DELETE' }).catch(() => undefined);
    setBusy(false);
    onChanged();
  };
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      {a.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-muted dark:bg-zinc-800">{a.workspaceName.charAt(0)}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink dark:text-zinc-100">{a.workspaceName} <span className="font-normal text-muted">· {a.product}</span></p>
        <p className="truncate text-xs text-muted">{a.connectedAt ? `Connected as @${a.username ?? '…'}` : 'Not connected'} · {a.ownerEmail}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {a.connectedAt ? (
        <button onClick={() => void disconnect()} disabled={busy} className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold text-muted transition hover:text-red-600 disabled:opacity-40">Disconnect</button>
      ) : (
        <button onClick={() => void connect()} disabled={busy} className="min-h-10 shrink-0 rounded-full bg-ink px-4 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">{busy ? 'Opening…' : 'Connect'}</button>
      )}
    </li>
  );
}

/**
 * Settings sheet: connect a workspace's TikTok account from the admin. TikTok signs in whoever is logged in to TikTok
 * in this browser, so log in to the right TikTok account first.
 */
export function TikTokAccounts({ token, onClose }: Props) {
  const [q, setQ] = useState('');
  const { data, error, loading, refresh } = useAdminApi<{ accounts: TikTokAccountDto[]; tiktokConfigured: boolean }>(token, `/api/admin/auto-slideshow/tiktok-accounts?q=${encodeURIComponent(q)}`);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="TikTok accounts" onClick={(e) => e.stopPropagation()} className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-center gap-3 border-b border-line p-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl font-normal text-ink dark:text-zinc-100">TikTok accounts</h2>
            <p className="text-xs text-muted">Log in to the right TikTok account in this browser, then Connect.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>
        <div className="space-y-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {data && !data.tiktokConfigured && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">TikTok keys are missing on this server.</p>}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workspace or owner email" className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && !data ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div>
          ) : data?.accounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No workspace matches.</p>
          ) : (
            <ul className="space-y-2">{data?.accounts.map((a) => <Row key={a.workspaceId} token={token} account={a} onChanged={refresh} />)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
