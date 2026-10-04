'use client';

import { useState } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import { adminFetch } from '../../business/useAdminApi';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
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
  /** Planned Blitz videos: approved with the same TikTok choices (TikTok only). */
  videos: BlitzScheduleDto[];
  /** After videos were approved: re-read them. */
  onVideosChanged: () => void;
  posting: ReturnType<typeof usePosting>;
  onClose: () => void;
};

const notice = 'rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300';

type Thumb = { id: string; cover: string | null; coverIsVideo: boolean; title: string; at: Date; video: boolean };

const thumbsOf = (items: Props['items'], videos: BlitzScheduleDto[]): Thumb[] =>
  [
    ...items.map(({ show, at }) => ({ id: show.id, cover: show.slides[0]?.imageUrl ?? null, coverIsVideo: false, title: show.topic, at, video: false })),
    ...videos.map((v) => ({ id: v.id, cover: v.coverUrl, coverIsVideo: v.coverIsVideo, title: v.title, at: new Date(v.scheduledAt), video: true })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

function Preview({ items, videos }: Pick<Props, 'items' | 'videos'>) {
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {thumbsOf(items, videos).map((t) => (
        <li key={t.id} className="w-20 shrink-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {t.cover && <CoverMedia src={t.cover} video={t.coverIsVideo} alt={t.title} />}
            {t.video && (
              <span aria-label="Video" className="absolute right-1 bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                <svg aria-hidden viewBox="0 0 10 10" className="h-2 w-2" fill="currentColor"><path d="M2.5 1.5v7l6-3.5z" /></svg>
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[10px] text-muted">{formatWhen(t.at)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Approves each planned video with the batch's TikTok choices. Resolves the first error, or null. */
const approveVideos = async (token: string, workspaceId: string, videos: BlitzScheduleDto[], tiktok: NonNullable<Parameters<ReturnType<typeof usePosting>['schedule']>[0]['tiktok']>) => {
  for (const v of videos) {
    try {
      await adminFetch(token, `/api/admin/blitz/schedule/${v.id}`, { method: 'POST', headers: { 'X-Workspace-Id': workspaceId }, body: JSON.stringify({ tiktok }) });
    } catch (err) {
      return `Video "${v.title}": ${err instanceof Error ? err.message : 'could not be approved'}`;
    }
  }
  return null;
};

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
type FormProps = Pick<Props, 'token' | 'run' | 'posting'> & { accounts: RunAccountsDto; items: ScheduleItems; videoCount: number; onApprove: (req: Parameters<Props['posting']['schedule']>[0]) => Promise<boolean> };

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
function PlatformsAndForm({ token, run, accounts, items, videoCount, posting, onApprove }: FormProps) {
  const [platforms, setPlatforms] = useState<PostPlatform[]>(() => defaultPlatforms(accounts));
  if (!accounts.accounts.tiktok && !accounts.accounts.instagram) return <ConnectFirst accounts={accounts} token={token} />;
  const withVideos = platforms.includes('tiktok') ? videoCount : 0;
  // Videos post to TikTok only: without it, only the slideshows can be approved.
  const nothing = items.length + withVideos === 0;
  return (
    <>
      <PlatformPicker accounts={accounts} value={platforms} onChange={setPlatforms} />
      {videoCount > 0 && !platforms.includes('tiktok') && <p className={notice}>Videos post to TikTok only. Pick TikTok to approve {videoCount === 1 ? 'it' : 'them'}.</p>}
      {platforms.length > 0 && !nothing && <ApproveForm key={platforms.join()} token={token} runId={run.id} items={items} platforms={platforms} total={items.length + withVideos} busy={posting.busy === 'schedule'} onApprove={onApprove} />}
    </>
  );
}

/** One approval for the whole batch: slideshows and planned Blitz videos, the account, the platforms, then their choices. */
export function ApproveSheet({ token, run, items, videos, onVideosChanged, posting, onClose }: Props) {
  const [videoError, setVideoError] = useState<string | null>(null);
  const approve = async (req: Parameters<typeof posting.schedule>[0]) => {
    setVideoError(null);
    if (req.items.length > 0 && !(await posting.schedule(req))) return false;
    const workspaceId = posting.accounts?.workspaceId;
    if (req.tiktok && workspaceId && videos.length > 0) {
      const failure = await approveVideos(token, workspaceId, videos, req.tiktok);
      onVideosChanged();
      if (failure) {
        setVideoError(failure);
        return false;
      }
    }
    onClose();
    return true;
  };
  const scheduleItems = items.map(({ show, at }) => ({ slideshowId: show.id, scheduledAt: at.toISOString() }));
  const total = items.length + videos.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Approve posts" onClick={(e) => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-950">
        <header className="flex items-center gap-3 border-b border-line p-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-ink dark:text-zinc-100">Approve {total} {total === 1 ? 'post' : 'posts'}</h3>
            <p className="text-xs text-muted">They go out on their days, and you can cancel any before then. On TikTok, TikTok picks the music, often a trending sound.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          <Preview items={items} videos={videos} />
          {(posting.error || videoError) && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{posting.error ?? videoError}</p>}
          {!posting.accounts?.workspaceId && <AccountPicker token={token} run={run} posting={posting} />}
          {posting.accounts?.workspaceId && <PlatformsAndForm key={posting.accounts.workspaceId} token={token} run={run} accounts={posting.accounts} items={scheduleItems} videoCount={videos.length} posting={posting} onApprove={approve} />}
        </div>
      </div>
    </div>
  );
}
