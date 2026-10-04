'use client';

import { POST_PLATFORMS, type RunAccountsDto } from '../../../../types/admin/autoSlideshow';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';

/** The connected posting accounts, as small chips. */
export function Accounts({ accounts }: { accounts: RunAccountsDto | null | undefined }) {
  const connected = POST_PLATFORMS.flatMap((p) => (accounts?.accounts[p] ? [{ p, username: accounts.accounts[p]!.username }] : []));
  if (connected.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {connected.map(({ p, username }) => (
        <span key={p} className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-ink dark:bg-zinc-800 dark:text-zinc-100">
          <PlatformIcon id={p} className="h-3 w-3" />{username ? `@${username.replace(/^@/, '')}` : 'connected'}
        </span>
      ))}
    </div>
  );
}
