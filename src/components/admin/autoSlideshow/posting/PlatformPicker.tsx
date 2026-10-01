'use client';

import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { PLATFORM_LABELS, POST_PLATFORMS, type PostPlatform, type RunAccountsDto } from '../../../../types/admin/autoSlideshow';

type Props = {
  accounts: RunAccountsDto;
  value: PostPlatform[];
  onChange: (v: PostPlatform[]) => void;
  /** Platforms this slideshow is already live on: shown, not pickable. */
  live?: PostPlatform[];
  tone?: 'light' | 'dark';
};

const handle = (u: string | null) => (u ? (u.startsWith('@') ? u : `@${u}`) : 'connected');

/** "Post to": one checkbox per platform; a platform without a connected account says where to connect it. */
export function PlatformPicker({ accounts, value, onChange, live = [], tone = 'light' }: Props) {
  const dark = tone === 'dark';
  const toggle = (p: PostPlatform) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <fieldset className="space-y-2">
      <legend className={`mb-1 text-[11px] font-semibold tracking-widest uppercase ${dark ? 'text-white/50' : 'text-muted'}`}>Post to</legend>
      {POST_PLATFORMS.map((p) => {
        const account = accounts.accounts[p];
        const isLive = live.includes(p);
        const disabled = !account || isLive;
        const note = isLive ? 'Already posted or scheduled' : account ? handle(account.username) : accounts.configured[p] ? 'Not connected · Settings → Accounts' : 'Not available yet';
        return (
          <label key={p} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${dark ? 'border-white/15' : 'border-line dark:border-zinc-800'} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={value.includes(p)} disabled={disabled} onChange={() => toggle(p)} className="h-5 w-5 shrink-0 accent-blue-600" />
            <PlatformIcon id={p} className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${dark ? 'text-white' : 'text-ink dark:text-zinc-100'}`}>{PLATFORM_LABELS[p]}</span>
              <span className={`block truncate text-xs ${dark ? 'text-white/50' : 'text-muted'}`}>{note}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Connected platforms not yet live, in display order: the default selection. */
export const defaultPlatforms = (accounts: RunAccountsDto, live: PostPlatform[] = []) => POST_PLATFORMS.filter((p) => accounts.accounts[p] && !live.includes(p));
