'use client';

import type { AutoRunDto, CreatorInfoDto } from '../../../types/admin/autoSlideshow';
import { useAdminApi } from '../business/useAdminApi';
import { PostQueue } from './PostQueue';
import { SchedulePlanner } from './SchedulePlanner';
import { usePosting } from './usePosting';

type Props = { token: string; run: AutoRunDto; onRunChanged: () => void };

const card = 'space-y-4 rounded-xl border border-line bg-white p-4 shadow-sm md:p-5 dark:border-zinc-800 dark:bg-zinc-900';
const notice = 'rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300';

/** The account that will post, as TikTok reports it right now. */
function CreatorCard({ creator }: { creator: CreatorInfoDto }) {
  return (
    <div className="flex items-center gap-3">
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold dark:bg-zinc-800">{creator.nickname.charAt(0)}</span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink dark:text-zinc-100">{creator.nickname}</p>
        <p className="truncate text-xs text-muted">@{creator.username} · posting as this account</p>
      </div>
    </div>
  );
}

/** Loads live creator info for the picked workspace, then shows the approval form. */
function Planner({ token, run, busy, onSchedule, scheduledIds }: { token: string; run: AutoRunDto; busy: boolean; onSchedule: Parameters<typeof SchedulePlanner>[0]['onSchedule']; scheduledIds: Set<string> }) {
  const { data, error, loading } = useAdminApi<{ creator: CreatorInfoDto }>(token, `/api/admin/auto-slideshow/runs/${run.id}/tiktok?w=${run.workspaceId}`);
  const open = run.slideshows.filter((s) => s.status === 'ready' && !scheduledIds.has(s.id));
  if (loading && !data) return <div className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;
  if (error || !data) return <p className={notice}>{error ?? 'Could not reach TikTok.'}</p>;
  return (
    <div className="space-y-4">
      <CreatorCard creator={data.creator} />
      {open.length === 0 ? (
        <p className="text-sm text-muted">Every ready slideshow is already scheduled.</p>
      ) : (
        <SchedulePlanner key={open.map((s) => s.id).join()} creator={data.creator} slideshows={open} busy={busy} onSchedule={onSchedule} />
      )}
    </div>
  );
}

/** Phase 4: pick the workspace's TikTok account, approve and schedule slideshows, follow each post. */
export function PostingPanel({ token, run, onRunChanged }: Props) {
  const p = usePosting(token, run.id, onRunChanged);
  const active = new Set((p.posts ?? []).filter((x) => x.status !== 'failed' && x.status !== 'canceled').map((x) => x.slideshowId));
  const current = p.workspaces?.workspaces.find((w) => w.workspaceId === run.workspaceId);

  return (
    <section className={card}>
      <div>
        <h3 className="text-base font-extrabold text-ink dark:text-zinc-100">Post to TikTok</h3>
        <p className="text-xs text-muted">Approve once, then posts go out at their times. Photos carry TikTok&apos;s own trending sound.</p>
      </div>
      {p.error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{p.error}</p>}

      {!p.workspaces ? (
        p.workspacesError ? <p className={notice}>{p.workspacesError}</p> : <div className="h-11 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      ) : !p.workspaces.tiktokConfigured ? (
        <p className={notice}>TikTok is not set up on this server yet: add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.</p>
      ) : p.workspaces.workspaces.length === 0 ? (
        <p className={notice}>No workspace has TikTok connected. Sign in to the app as the workspace owner, then Settings → Integrations → Connect TikTok.</p>
      ) : (
        <label className="block space-y-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
          <span>Workspace</span>
          <select
            value={run.workspaceId ?? ''}
            disabled={p.busy !== null}
            onChange={(e) => void p.pickWorkspace(e.target.value || null)}
            className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base font-normal text-ink normal-case focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Choose a workspace…</option>
            {p.workspaces.workspaces.map((w) => <option key={w.workspaceId} value={w.workspaceId}>{w.workspaceName}{w.username ? ` · @${w.username}` : ''}</option>)}
          </select>
        </label>
      )}

      {current && <Planner token={token} run={run} busy={p.busy === 'schedule'} scheduledIds={active} onSchedule={p.schedule} />}

      {p.posts && p.posts.length > 0 && (
        <div className="space-y-2 border-t border-line pt-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold tracking-wider text-muted uppercase">Posts</h4>
            <button onClick={p.refreshPosts} className="min-h-10 px-2 text-xs font-medium text-blue-600 dark:text-blue-400">Refresh</button>
          </div>
          <PostQueue posts={p.posts} slideshows={run.slideshows} busy={p.busy} onAction={(id, a) => void p.act(id, a)} />
        </div>
      )}
    </section>
  );
}
