'use client';

import { useState } from 'react';
import type { AutoRunDto, AutoSlideshowDto, PostPlatform, RunAccountsDto } from '../../../../types/admin/autoSlideshow';
import { defaultPlatforms, PlatformPicker } from '../posting/PlatformPicker';
import { formatWhen } from '../schedule';
import { AccountRow } from '../settings/AccountsSection';
import { TikTokAccounts } from '../TikTokAccounts';
import type { usePosting } from '../usePosting';
import { ApproveForm } from './ApproveForm';

type Props = {
  token: string;
  run: AutoRunDto;
  items: { show: AutoSlideshowDto; at: Date }[];
  posting: ReturnType<typeof usePosting>;
  onClose: () => void;
};

const notice = 'rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300';

function Preview({ items }: { items: Props['items'] }) {
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map(({ show, at }) => (
        <li key={show.id} className="w-20 shrink-0">
          <div className="aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {show.slides[0]?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={show.slides[0].imageUrl} alt={show.topic} className="h-full w-full object-cover" />
            )}
          </div>
          <p className="mt-1 truncate text-[10px] text-muted">{formatWhen(at)}</p>
        </li>
      ))}
    </ul>
  );
}

/** The account that posts: pick a workspace, or connect TikTok when none has it. */
function AccountPicker({ token, run, posting }: Pick<Props, 'token' | 'run' | 'posting'>) {
  const [connecting, setConnecting] = useState(false);
  const w = posting.workspaces;
  if (!w) return posting.workspacesError ? <p className={notice}>{posting.workspacesError}</p> : <div className="h-11 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  if (!w.tiktokConfigured) return <p className={notice}>TikTok is not set up on this server yet: add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.</p>;
  if (w.workspaces.length === 0) {
    return (
      <>
        <button onClick={() => setConnecting(true)} className="min-h-11 w-full rounded-full border border-line text-sm font-semibold text-ink transition active:scale-95 dark:border-zinc-700 dark:text-zinc-100">Connect a TikTok account</button>
        {connecting && <TikTokAccounts token={token} onClose={() => setConnecting(false)} />}
      </>
    );
  }
  return (
    <select
      aria-label="TikTok account"
      value={run.workspaceId ?? ''}
      disabled={posting.busy !== null}
      onChange={(e) => void posting.pickWorkspace(e.target.value || null)}
      className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <option value="">Choose the TikTok account…</option>
      {w.workspaces.map((x) => <option key={x.workspaceId} value={x.workspaceId}>{x.workspaceName}{x.username ? ` · @${x.username}` : ''}</option>)}
    </select>
  );
}

type ScheduleItems = { slideshowId: string; scheduledAt: string }[];
type FormProps = Pick<Props, 'token' | 'run' | 'posting'> & { accounts: RunAccountsDto; items: ScheduleItems; onApprove: (req: Parameters<Props['posting']['schedule']>[0]) => Promise<boolean> };

/** No platform connected yet: connect one right here, the same rows as Settings → Accounts. Connecting returns to this page. */
function ConnectFirst({ token, accounts }: { token: string; accounts: RunAccountsDto }) {
  const workspace = accounts.workspaceId;
  if (!workspace) return null;
  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold text-ink dark:text-zinc-100">Connect where to post</p>
      <ul className="space-y-2">
        {(['tiktok', 'instagram'] as const).map((p) => (
          <AccountRow key={p} token={token} workspace={workspace} provider={p} connection={undefined} available={accounts.configured[p]} onChanged={() => undefined} />
        ))}
      </ul>
    </section>
  );
}

/** Platforms, then the approval form for them. */
function PlatformsAndForm({ token, run, accounts, items, posting, onApprove }: FormProps) {
  const [platforms, setPlatforms] = useState<PostPlatform[]>(() => defaultPlatforms(accounts));
  if (!accounts.accounts.tiktok && !accounts.accounts.instagram) return <ConnectFirst accounts={accounts} token={token} />;
  return (
    <>
      <PlatformPicker accounts={accounts} value={platforms} onChange={setPlatforms} />
      {platforms.length > 0 && <ApproveForm key={platforms.join()} token={token} runId={run.id} items={items} platforms={platforms} busy={posting.busy === 'schedule'} onApprove={onApprove} />}
    </>
  );
}

/** One approval for the whole week: the posts and their days, the account, the platforms, then their choices. */
export function ApproveSheet({ token, run, items, posting, onClose }: Props) {
  const approve = async (req: Parameters<typeof posting.schedule>[0]) => {
    const ok = await posting.schedule(req);
    if (ok) onClose();
    return ok;
  };
  const scheduleItems = items.map(({ show, at }) => ({ slideshowId: show.id, scheduledAt: at.toISOString() }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Approve posts" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-center gap-3 border-b border-line p-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-ink dark:text-zinc-100">Approve {items.length} {items.length === 1 ? 'post' : 'posts'}</h3>
            <p className="text-xs text-muted">They go out on their days, and you can cancel any before then. On TikTok, TikTok picks the music, often a trending sound.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          <Preview items={items} />
          {posting.error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{posting.error}</p>}
          {!posting.accounts?.workspaceId && <AccountPicker token={token} run={run} posting={posting} />}
          {posting.accounts?.workspaceId && <PlatformsAndForm key={posting.accounts.workspaceId} token={token} run={run} accounts={posting.accounts} items={scheduleItems} posting={posting} onApprove={approve} />}
        </div>
      </div>
    </div>
  );
}
