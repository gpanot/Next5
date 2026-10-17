'use client';

import { useState } from 'react';
import type { PlatformId } from '../../../../content/business/offer';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';

/** One channel to post to: its account (when connected) and whether this app can post there at all. */
export type ChannelRow<P extends PlatformId> = { id: P; label: string; username: string | null; connected: boolean; available: boolean };

type Props<P extends PlatformId> = {
  rows: ChannelRow<P>[];
  value: P[];
  onChange: (next: P[]) => void;
  /** `many`: tick several (slideshows). `one`: pick one (a Blitz video posts to one platform). */
  mode?: 'many' | 'one';
  /** Channels this post is already live on: shown, not pickable. */
  live?: P[];
  tone?: 'light' | 'dark';
  /** Starts a channel's sign-in (back to this page once approved). Left out: the row says to connect it in Settings. */
  connect?: (id: P) => Promise<void> | void;
};

const handle = (u: string | null) => (u ? (u.startsWith('@') ? u : `@${u}`) : 'Connected');

function ConnectButton({ onConnect }: { onConnect: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the connection');
    }
    // A sign-in leaves the page; anything else (Instagram's account question) comes back here.
    setBusy(false);
  };
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button type="button" onClick={() => void go()} disabled={busy} className="min-h-10 rounded-full bg-ink px-4 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
        {busy ? 'Opening…' : 'Connect'}
      </button>
      {error && <span role="alert" className="max-w-40 text-right text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}

/**
 * "Post to": one row per channel, the same for slideshows and Blitz videos. A connected channel is ticked or picked;
 * one not connected yet offers Connect right in its row.
 */
export function ChannelList<P extends PlatformId>({ rows, value, onChange, mode = 'many', live = [], tone = 'light', connect }: Props<P>) {
  const dark = tone === 'dark';
  const pick = (id: P) => onChange(mode === 'one' ? [id] : value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset className="space-y-2">
      <legend className={`mb-1 text-[11px] font-semibold tracking-widest uppercase ${dark ? 'text-white/50' : 'text-muted'}`}>Post to</legend>
      {rows.map((row) => {
        const isLive = live.includes(row.id);
        const disabled = !row.connected || isLive;
        const canConnect = !row.connected && !isLive && row.available && Boolean(connect);
        const note = isLive ? 'Already posted or scheduled' : row.connected ? handle(row.username) : !row.available ? 'Not available yet' : connect ? 'Not connected' : 'Not connected · Settings → Accounts';
        const faded = disabled ? 'opacity-50' : '';
        return (
          <label key={row.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-1.5 ${dark ? 'border-white/15' : 'border-line dark:border-zinc-800'} ${disabled ? '' : 'cursor-pointer'}`}>
            <input type={mode === 'one' ? 'radio' : 'checkbox'} name={mode === 'one' ? 'post-to' : undefined} checked={value.includes(row.id) && !disabled} disabled={disabled} onChange={() => pick(row.id)} className={`h-5 w-5 shrink-0 accent-blue-600 ${faded}`} />
            <PlatformIcon id={row.id} className={`h-5 w-5 shrink-0 ${faded}`} />
            <span className={`min-w-0 flex-1 ${faded}`}>
              <span className={`block text-sm font-semibold ${dark ? 'text-white' : 'text-ink dark:text-zinc-100'}`}>{row.label}</span>
              <span className={`block truncate text-xs ${dark ? 'text-white/50' : 'text-muted'}`}>{note}</span>
            </span>
            {canConnect && <ConnectButton onConnect={() => connect!(row.id)} />}
          </label>
        );
      })}
    </fieldset>
  );
}
