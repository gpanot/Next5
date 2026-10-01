'use client';

import { useState } from 'react';
import { PlatformIcon } from '../../../marketing/offer/PlatformMarks';
import { PLATFORM_LABELS, PRIVACY_LABELS, type AutoPostDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import { PostStatsLine } from './PostStats';

const STATUS: Record<AutoPostDto['status'], string> = {
  scheduled: 'Scheduled', sending: 'Sending…', processing: 'Publishing…', posted: 'Posted', failed: 'Failed', canceled: 'Canceled',
};

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return min < 60 ? `${Math.max(min, 1)} min ago` : min < 48 * 60 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
};

type Props = { token: string; runId: string; post: AutoPostDto; onChange: (p: AutoPostDto) => void };

/** One platform's post in the dark editor: where it is, its numbers once live, and a check / refresh button. */
export function PostStatusRow({ token, runId, post, onChange }: Props) {
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    const res = await adminFetch<{ posts: AutoPostDto[] }>(token, `/api/admin/auto-slideshow/runs/${runId}/posts/${post.id}`, { method: 'POST', body: JSON.stringify({ action: 'refresh' }) }).catch(() => null);
    const next = res?.posts.find((p) => p.id === post.id);
    if (next) onChange(next);
    setChecking(false);
  };
  const canCheck = post.status === 'processing' || post.status === 'sending' || post.status === 'posted';
  return (
    <div className="space-y-2 rounded-xl border border-white/10 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <PlatformIcon id={post.platform} className="h-4 w-4" />
        {PLATFORM_LABELS[post.platform]} · {STATUS[post.status]}
        {post.platform === 'tiktok' && <span className="font-normal text-white/50">· {PRIVACY_LABELS[post.privacyLevel] ?? post.privacyLevel}</span>}
      </p>
      {post.status === 'posted' && <PostStatsLine stats={post.stats} className="text-white/80" />}
      {post.status === 'posted' && <p className="text-[11px] text-white/40">{post.statsAt ? `Numbers updated ${ago(post.statsAt)}` : 'Numbers come in within a few hours.'}</p>}
      {post.error && <p className="text-xs text-red-300">{post.error}</p>}
      <div className="flex gap-2">
        {canCheck && (
          <button onClick={() => void check()} disabled={checking} className="min-h-10 rounded-full border border-white/30 px-4 text-xs font-semibold disabled:opacity-40">
            {checking ? 'Checking…' : post.status === 'posted' ? 'Refresh numbers' : 'Check status'}
          </button>
        )}
        {post.postUrl && <a href={post.postUrl} target="_blank" rel="noreferrer" className="flex min-h-10 items-center rounded-full bg-white px-4 text-xs font-semibold text-black">Open on {PLATFORM_LABELS[post.platform]} ↗</a>}
      </div>
    </div>
  );
}
