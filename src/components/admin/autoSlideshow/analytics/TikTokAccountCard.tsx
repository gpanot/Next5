'use client';

import { useState } from 'react';
import type { TikTokAccountDto, TikTokAccountStatsDto } from '../../../../types/admin/slideshowAnalytics';
import { compact } from '../posting/PostStats';
import { startConnect } from '../settings/AccountsSection';
import { TikTokGlyph } from '../workspace/PlatformBadges';

type Props = { token: string; workspaceId: string; account: TikTokAccountDto };

const TOTALS: Array<[keyof TikTokAccountStatsDto, string]> = [
  ['followers', 'Followers'],
  ['likes', 'Likes'],
  ['posts', 'Posts'],
];

const handle = (username: string | null) => (username ? (username.startsWith('@') ? username : `@${username}`) : 'TikTok');

function Avatar({ url }: { url: string | null }) {
  if (!url) return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-sunken text-app-ink"><TikTokGlyph /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
}

function Totals({ stats }: { stats: TikTokAccountStatsDto }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {TOTALS.map(([key, label]) => (
        <div key={key} className="min-w-0 rounded-lg bg-app-sunken px-3 py-2">
          <dt className="text-xs font-semibold text-app-muted">{label}</dt>
          <dd className="truncate text-lg font-extrabold text-app-ink tabular-nums">{stats[key] === null ? '—' : compact(stats[key]!)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReconnectButton({ token, workspaceId }: Omit<Props, 'account'>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await startConnect(token, workspaceId, 'tiktok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open TikTok');
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-app-muted">Connect TikTok again to see followers and exact numbers for each post. Your posts stay as they are.</p>
      <button onClick={() => void reconnect()} disabled={busy} className="min-h-11 w-full rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink transition active:scale-95 disabled:opacity-40 sm:w-auto">
        {busy ? 'Opening TikTok…' : 'Reconnect TikTok'}
      </button>
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </div>
  );
}

/** The workspace's TikTok account: followers, likes and posts now, or a reconnect for accounts missing the scopes. */
export function TikTokAccountCard({ token, workspaceId, account }: Props) {
  if (account.state === 'none') return null;
  return (
    <section className="space-y-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar url={account.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-app-ink">{handle(account.username)}</p>
          <p className="text-xs text-app-muted">TikTok account</p>
        </div>
      </div>
      {account.state === 'connected' && <Totals stats={account.stats} />}
      {account.state === 'reconnect' && <ReconnectButton token={token} workspaceId={workspaceId} />}
      {account.state === 'unavailable' && <p className="text-sm text-app-muted">TikTok did not answer. Account numbers show on your next visit.</p>}
    </section>
  );
}
