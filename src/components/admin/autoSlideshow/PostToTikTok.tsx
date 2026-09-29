'use client';

import { useState } from 'react';
import { PRIVACY_LABELS, type AutoPostDto, type AutoSlideshowDto, type CreatorInfoDto, type TikTokWorkspaceDto } from '../../../types/admin/autoSlideshow';
import { adminFetch, useAdminApi } from '../business/useAdminApi';
import { Toggle } from './SchedulePlanner';
import { TikTokAccounts } from './TikTokAccounts';

type Props = { token: string; runId: string; show: AutoSlideshowDto; defaultWorkspaceId: string | null; onPosted: () => void };

const field = 'min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-base text-white focus:border-white/50 focus:outline-none';
const label = 'text-[11px] font-semibold tracking-widest text-white/50 uppercase';
const STATUS: Record<AutoPostDto['status'], string> = {
  scheduled: 'Scheduled', sending: 'Sending…', processing: 'TikTok is publishing…', posted: 'Posted', failed: 'Failed', canceled: 'Canceled',
};

/** Where the post is now, with a status check while TikTok publishes. */
function PostStatus({ token, runId, post, onChange }: { token: string; runId: string; post: AutoPostDto; onChange: (p: AutoPostDto) => void }) {
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    const res = await adminFetch<{ posts: AutoPostDto[] }>(token, `/api/admin/auto-slideshow/runs/${runId}/posts/${post.id}`, { method: 'POST', body: JSON.stringify({ action: 'refresh' }) }).catch(() => null);
    const next = res?.posts.find((p) => p.id === post.id);
    if (next) onChange(next);
    setChecking(false);
  };
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <p className="text-sm font-semibold">{STATUS[post.status]} · {PRIVACY_LABELS[post.privacyLevel] ?? post.privacyLevel}</p>
      {post.error && <p className="text-xs text-red-300">{post.error}</p>}
      <div className="flex gap-2">
        {(post.status === 'processing' || post.status === 'sending') && (
          <button onClick={() => void check()} disabled={checking} className="min-h-10 rounded-full border border-white/30 px-4 text-xs font-semibold disabled:opacity-40">{checking ? 'Checking…' : 'Check status'}</button>
        )}
        {post.postUrl && <a href={post.postUrl} target="_blank" rel="noreferrer" className="flex min-h-10 items-center rounded-full bg-white px-4 text-xs font-semibold text-black">Open on TikTok ↗</a>}
      </div>
    </div>
  );
}

/** The approval form for one post, per TikTok's rules: account shown, privacy picked, disclosure, consent. */
function PostForm({ token, runId, show, workspaceId, onSent }: { token: string; runId: string; show: AutoSlideshowDto; workspaceId: string; onSent: (p: AutoPostDto) => void }) {
  const creator = useAdminApi<{ creator: CreatorInfoDto }>(token, `/api/admin/auto-slideshow/runs/${runId}/tiktok?workspaceId=${workspaceId}`);
  const [privacy, setPrivacy] = useState('');
  const [comments, setComments] = useState(true);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = creator.data?.creator;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await adminFetch<{ post: AutoPostDto }>(token, `/api/admin/auto-slideshow/runs/${runId}/slideshows/${show.id}/post`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId, privacyLevel: privacy, allowComments: comments && !c?.commentDisabled, brandOrganic, brandContent: false, consent }),
      });
      onSent(res.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setSending(false);
    }
  };

  if (!c) return creator.error ? <p className="text-sm text-red-300">{creator.error}</p> : <div className="h-24 animate-pulse rounded-xl bg-white/10" />;
  return (
    <div className="space-y-2">
      <p className="text-sm">Posting as <span className="font-semibold">{c.nickname}</span> <span className="text-white/50">@{c.username}</span></p>
      <select aria-label="Who can see this post" value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={field}>
        <option value="" disabled>Who can see this post…</option>
        {c.privacyOptions.map((p) => <option key={p} value={p}>{PRIVACY_LABELS[p] ?? p}</option>)}
      </select>
      <div className="text-white [&_span]:text-white">
        <Toggle on={comments && !c.commentDisabled} onChange={setComments} disabled={c.commentDisabled}>Allow comments</Toggle>
        <Toggle on={brandOrganic} onChange={setBrandOrganic}>Promotes my own business (&quot;Promotional content&quot; label)</Toggle>
        <Toggle on={consent} onChange={setConsent}>
          I agree to TikTok&apos;s <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
        </Toggle>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button onClick={() => void send()} disabled={!privacy || !consent || sending} className="min-h-12 w-full rounded-full bg-[#fe2c55] text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40">
        {sending ? 'Posting…' : 'Post to TikTok now'}
      </button>
    </div>
  );
}

/** Editor section: post this slideshow to a connected TikTok account now, then follow it until it is live. */
export function PostToTikTok({ token, runId, show, defaultWorkspaceId, onPosted }: Props) {
  const accounts = useAdminApi<{ workspaces: TikTokWorkspaceDto[] }>(token, '/api/admin/auto-slideshow/workspaces');
  const [workspaceId, setWorkspaceId] = useState<string | null>(defaultWorkspaceId);
  const [post, setPost] = useState<AutoPostDto | null>(show.post);
  const [connecting, setConnecting] = useState(false);
  const list = accounts.data?.workspaces ?? [];
  const chosen = workspaceId ?? (list.length === 1 ? list[0]!.workspaceId : null);
  const done = post && post.status !== 'failed' && post.status !== 'canceled';

  const update = (p: AutoPostDto) => {
    setPost(p);
    onPosted();
  };

  return (
    <div className="space-y-2">
      <p className={label}>Post to TikTok</p>
      {post && <PostStatus token={token} runId={runId} post={post} onChange={update} />}
      {!done && (accounts.data && list.length === 0 ? (
        <button onClick={() => setConnecting(true)} className="min-h-11 w-full rounded-full border border-white/30 text-sm font-semibold transition active:scale-95">Connect a TikTok account</button>
      ) : (
        <>
          {list.length > 1 && (
            <select aria-label="TikTok account" value={chosen ?? ''} onChange={(e) => setWorkspaceId(e.target.value || null)} className={field}>
              <option value="">Choose an account…</option>
              {list.map((w) => <option key={w.workspaceId} value={w.workspaceId}>{w.workspaceName}{w.username ? ` · @${w.username}` : ''}</option>)}
            </select>
          )}
          {chosen && <PostForm key={chosen} token={token} runId={runId} show={show} workspaceId={chosen} onSent={update} />}
        </>
      ))}
      {connecting && <TikTokAccounts token={token} onClose={() => { setConnecting(false); accounts.refresh(); }} />}
    </div>
  );
}
