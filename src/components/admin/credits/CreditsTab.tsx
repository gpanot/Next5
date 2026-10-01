'use client';

import { useEffect, useState } from 'react';
import { usd, type AdminCreditUserDto } from '../../../types/admin/slideshowCredits';
import { useAdminApi } from '../business/useAdminApi';
import { UserCreditsPanel } from './UserCreditsPanel';

/** Debounced search text, so typing does not fire a request per key. */
const useDebounced = (value: string, ms = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};

function UserRow({ user, selected, onSelect }: { user: AdminCreditUserDto; selected: boolean; onSelect: () => void }) {
  return (
    <li>
      <button onClick={onSelect} aria-current={selected} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 aria-[current=true]:bg-ink/5 dark:hover:bg-zinc-800">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink dark:text-zinc-100">{user.email}</p>
          <p className="truncate text-[11px] text-muted">
            {user.workspaces} workspace{user.workspaces === 1 ? '' : 's'} · {user.slideshowsCharged} paid slideshow{user.slideshowsCharged === 1 ? '' : 's'}
            {user.autoRecharge && ' · Auto top up'}
          </p>
        </div>
        <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${user.balanceCents !== null && user.balanceCents < 0 ? 'text-red-600' : 'text-ink dark:text-zinc-100'}`}>
          {user.balanceCents === null ? '—' : usd(user.balanceCents)}
        </span>
      </button>
    </li>
  );
}

/** Admin → Users → Credits: every Auto Slideshow user with their balance; pick one to add credits by hand. */
export function CreditsTab({ token }: { token: string }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, error, loading, refresh } = useAdminApi<{ users: AdminCreditUserDto[] }>(token, `/api/admin/credits?q=${encodeURIComponent(q)}`);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data?.users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-display text-[22px] tracking-[0.04em] text-ink uppercase dark:text-zinc-100">Credits</h2>
        <span className="text-[13px] text-muted">{data ? data.users.length : ''} Auto Slideshow users · 99¢ per slideshow</span>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email"
        className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink md:max-w-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {loading && !data && <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />)}</div>}
          {error && <p className="p-6 text-center text-[13px] text-red-600">{error}</p>}
          {data && data.users.length === 0 && <p className="p-10 text-center text-[13px] text-muted">{q ? 'No user matches this email.' : 'No Auto Slideshow users yet.'}</p>}
          <ul className="divide-y divide-line dark:divide-zinc-800">
            {data?.users.map((u) => <UserRow key={u.id} user={u} selected={u.id === selectedId} onSelect={() => setSelectedId(u.id)} />)}
          </ul>
        </div>
        {selected && (
          <div className="lg:sticky lg:top-0 lg:self-start">
            <UserCreditsPanel key={selected.id} token={token} user={selected} onChanged={refresh} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
