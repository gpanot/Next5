'use client';

import { useState } from 'react';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import type { ConnectionDto, SocialProviderDto } from '../../../../types/business/integrations';
import type { SlideshowMeDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import { InstagramTypeDialog } from './InstagramTypeDialog';

type Props = { token: string; me: SlideshowMeDto; onChanged: () => void };

const LABEL: Record<SocialProviderDto, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' };
const handle = (c: ConnectionDto) => (c.username ? ` as ${c.username.startsWith('@') ? c.username : `@${c.username}`}` : '');

/** Sends the browser to the platform's sign-in; it comes back to the same workspace page once approved. */
export const startConnect = async (token: string, workspace: string, provider: SocialProviderDto): Promise<void> => {
  const { url } = await adminFetch<{ url: string }>(token, `/api/app/integrations/${provider}`, { method: 'POST', body: JSON.stringify({ workspaceId: workspace, returnTo: 'slideshow', returnPath: window.location.pathname }) });
  window.location.href = url;
};

export type AccountRowProps = { token: string; workspace: string; provider: SocialProviderDto; connection: ConnectionDto | undefined; available: boolean; soon?: boolean; onChanged: () => void };

/** One platform: its state, and Connect or Disconnect. Also used in the approve sheet. */
export function AccountRow({ token, workspace, provider, connection, available, soon, onChanged }: AccountRowProps) {
  const [busy, setBusy] = useState(false);
  // Instagram asks the account type first: only Business and Creator accounts can be connected.
  const [askingType, setAskingType] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await startConnect(token, workspace, provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the connection');
      setBusy(false);
    }
  };
  const disconnect = async () => {
    if (!window.confirm(`Disconnect ${LABEL[provider]}? Scheduled posts for it will fail. Posts already sent stay on ${LABEL[provider]}.`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(token, `/api/app/integrations/${provider}?workspaceId=${workspace}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disconnect');
    } finally {
      setBusy(false);
    }
  };

  const status = connection ? `Connected${handle(connection)}` : soon ? 'Coming soon' : available ? 'Not connected' : 'Not available yet';
  return (
    <li className="space-y-2 rounded-xl border border-line bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-ink dark:bg-zinc-800 dark:text-zinc-100"><PlatformIcon id={provider} className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink dark:text-zinc-100">{LABEL[provider]}</p>
          <p className="truncate text-xs text-muted">{status}</p>
        </div>
        {connection ? (
          <button onClick={() => void disconnect()} disabled={busy} className="min-h-10 shrink-0 rounded-full border border-line px-4 text-xs font-semibold text-muted transition hover:text-red-600 disabled:opacity-40 dark:border-zinc-700">Disconnect</button>
        ) : (
          <button onClick={() => (provider === 'instagram' ? setAskingType(true) : void connect())} disabled={busy || soon || !available} className="min-h-10 shrink-0 rounded-full bg-ink px-4 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">{busy ? 'Opening…' : 'Connect'}</button>
        )}
      </div>
      {!connection && provider === 'instagram' && available && <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-muted dark:bg-zinc-950">Needs an Instagram Professional account (Business or Creator). Instagram connects the account signed in to instagram.com in this browser.</p>}
      {!connection && provider === 'tiktok' && available && <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-muted dark:bg-zinc-950">TikTok connects the account signed in to TikTok in this browser. For a client&apos;s account, log in to it on tiktok.com first, then Connect. Each workspace keeps its own account.</p>}
      {!connection && provider === 'youtube' && available && <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-muted dark:bg-zinc-950">Posts as YouTube Shorts. Pick the Google account that owns the channel, and tick every permission box. Each workspace keeps its own channel.</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {askingType && <InstagramTypeDialog onClose={() => setAskingType(false)} onBusiness={() => { setAskingType(false); void connect(); }} />}
    </li>
  );
}

/** Connect or disconnect the account the slideshows post to. One account per platform. */
export function AccountsSection({ token, me, onChanged }: Props) {
  const find = (p: SocialProviderDto) => me.connections.find((c) => c.provider === p);
  return (
    <section className="space-y-3">
      <p className="text-sm text-muted">The account <span className="font-semibold text-ink dark:text-zinc-100">{me.workspace.name}</span> posts to. Each workspace has its own.</p>
      <ul className="space-y-2">
        <AccountRow token={token} workspace={me.workspace.id} provider="tiktok" connection={find('tiktok')} available={me.available.includes('tiktok')} onChanged={onChanged} />
        <AccountRow token={token} workspace={me.workspace.id} provider="instagram" connection={find('instagram')} available={me.available.includes('instagram')} onChanged={onChanged} />
        <AccountRow token={token} workspace={me.workspace.id} provider="youtube" connection={find('youtube')} available={me.available.includes('youtube')} onChanged={onChanged} />
      </ul>
    </section>
  );
}
