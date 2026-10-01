'use client';

import { useState } from 'react';
import { isAdminToken } from '../../../../lib/adminToken';
import type { AutoPostDto, AutoSlideshowDto, CreatorInfoDto, PostPlatform, RunAccountsDto, TikTokWorkspaceDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';
import { SettingsModal } from '../settings/SettingsModal';
import { TikTokAccounts } from '../TikTokAccounts';
import { useSlideshowWorkspace } from '../workspace/WorkspaceContext';
import { defaultPlatforms, PlatformPicker } from './PlatformPicker';
import { PostStatusRow } from './PostStatusRow';
import { TikTokFields, type TikTokFieldValues } from './TikTokFields';

type Props = { token: string; runId: string; show: AutoSlideshowDto; onPosted: () => void };

const label = 'text-[11px] font-semibold tracking-widest text-white/50 uppercase';
const LIVE: AutoPostDto['status'][] = ['scheduled', 'sending', 'processing', 'posted'];

/** Admin only: the run has no workspace yet, so pick the one whose accounts post. */
function AdminWorkspacePick({ token, runId, onPicked }: { token: string; runId: string; onPicked: () => void }) {
  const list = useAdminApi<{ workspaces: TikTokWorkspaceDto[] }>(token, '/api/admin/auto-slideshow/workspaces');
  const pick = async (workspaceId: string) => {
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/workspace`, { method: 'PUT', body: JSON.stringify({ workspaceId }) }).catch(() => undefined);
    onPicked();
  };
  return (
    <select aria-label="Account" defaultValue="" onChange={(e) => e.target.value && void pick(e.target.value)} className="min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-base text-white">
      <option value="">Choose the workspace that posts…</option>
      {list.data?.workspaces.map((w) => <option key={w.workspaceId} value={w.workspaceId}>{w.workspaceName}{w.username ? ` · @${w.username}` : ''}</option>)}
    </select>
  );
}

type FormProps = { token: string; runId: string; show: AutoSlideshowDto; accounts: RunAccountsDto; live: PostPlatform[]; onSent: (posts: AutoPostDto[]) => void };

/** Platforms, TikTok's choices when TikTok is picked, then "Post now". */
function PostNowForm({ token, runId, show, accounts, live, onSent }: FormProps) {
  const [platforms, setPlatforms] = useState<PostPlatform[]>(() => defaultPlatforms(accounts, live));
  const [tt, setTt] = useState<TikTokFieldValues>({ privacy: '', comments: true, brandOrganic: false, consent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withTikTok = platforms.includes('tiktok');
  const creator = useAdminApi<{ creator: CreatorInfoDto }>(token, withTikTok ? `/api/admin/auto-slideshow/runs/${runId}/tiktok?workspaceId=${accounts.workspaceId}` : null);
  const c = creator.data?.creator;
  const ready = platforms.length > 0 && (!withTikTok || (c && tt.privacy && tt.consent));

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const tiktok = withTikTok ? { privacyLevel: tt.privacy, allowComments: tt.comments && !c?.commentDisabled, brandOrganic: tt.brandOrganic, brandContent: false, consent: tt.consent } : null;
      const res = await adminFetch<{ posts: AutoPostDto[] }>(token, `/api/admin/auto-slideshow/runs/${runId}/slideshows/${show.id}/post`, { method: 'POST', body: JSON.stringify({ workspaceId: accounts.workspaceId, platforms, tiktok }) });
      onSent(res.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <PlatformPicker accounts={accounts} value={platforms} onChange={setPlatforms} live={live} tone="dark" />
      {withTikTok && (c ? <TikTokFields creator={c} value={tt} onChange={setTt} /> : creator.error ? <p className="text-sm text-red-300">{creator.error}</p> : <div className="h-24 animate-pulse rounded-xl bg-white/10" />)}
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button onClick={() => void send()} disabled={!ready || sending} className="min-h-12 w-full rounded-full bg-[#fe2c55] text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40">
        {sending ? 'Posting…' : 'Post now'}
      </button>
    </div>
  );
}

/** Editor section: post this slideshow to TikTok and/or Instagram now, then follow each post and its numbers. */
export function PostPanel({ token, runId, show, onPosted }: Props) {
  const accounts = useAdminApi<RunAccountsDto>(token, `/api/admin/auto-slideshow/runs/${runId}/accounts`);
  const workspace = useSlideshowWorkspace();
  const [posts, setPosts] = useState<AutoPostDto[]>(show.posts);
  const [connecting, setConnecting] = useState(false);
  const a = accounts.data;
  const live = posts.filter((p) => LIVE.includes(p.status)).map((p) => p.platform);
  const hasAccount = a && (a.accounts.tiktok || a.accounts.instagram);
  const canPostMore = a && defaultPlatforms(a, live).length > 0;
  const update = (next: AutoPostDto[]) => {
    setPosts(next);
    onPosted();
  };
  const closeConnect = () => {
    setConnecting(false);
    accounts.refresh();
  };

  return (
    <div className="space-y-2">
      <p className={label}>Post</p>
      {posts.map((p) => <PostStatusRow key={p.id} token={token} runId={runId} post={p} onChange={(n) => update(posts.map((x) => (x.id === n.id ? n : x)))} />)}
      {!a ? (accounts.error ? <p className="text-sm text-red-300">{accounts.error}</p> : <div className="h-12 animate-pulse rounded-xl bg-white/10" />)
        : !a.workspaceId ? <AdminWorkspacePick token={token} runId={runId} onPicked={accounts.refresh} />
        : !hasAccount ? <button onClick={() => setConnecting(true)} className="min-h-11 w-full rounded-full border border-white/30 text-sm font-semibold transition active:scale-95">Connect TikTok or Instagram</button>
        : canPostMore ? <PostNowForm key={live.join()} token={token} runId={runId} show={show} accounts={a} live={live} onSent={update} /> : null}
      {connecting && (isAdminToken(token) || !workspace
        ? <TikTokAccounts token={token} onClose={closeConnect} />
        : <SettingsModal token={token} workspaceId={workspace.id} initialTab="accounts" onClose={closeConnect} />)}
    </div>
  );
}
