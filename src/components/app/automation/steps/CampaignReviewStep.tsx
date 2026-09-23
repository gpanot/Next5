'use client';

/**
 * Step 7 — review the week as posts, not as rows.
 *
 * One 9:16 card per post, in the shape it will be posted. The media is a placeholder until
 * generation exists (Phase 1B) — the card says what will fill it rather than showing an empty
 * frame, so the plan is judgeable now.
 */
import { useState } from 'react';
import { Info, Pencil } from 'lucide-react';
import type { CampaignPostDto } from '../../../../types/business/campaigns';

const weekday = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

const ENGINE_LABELS: Record<string, string> = {
  blitz_slideshow: 'Slideshow',
  ugc_video: 'UGC video',
};

type Props = {
  posts: CampaignPostDto[];
  channels: string[];
  savingPostId: string | null;
  onCaption: (postId: string, caption: string) => void;
};

function PostCard({
  post,
  channels,
  saving,
  onCaption,
}: {
  post: CampaignPostDto;
  channels: string[];
  saving: boolean;
  onCaption: (caption: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.caption ?? '');
  const [showDetail, setShowDetail] = useState(false);

  const commit = () => {
    setEditing(false);
    if (draft !== (post.caption ?? '')) onCaption(draft);
  };

  return (
    <article className="flex w-[15rem] shrink-0 flex-col gap-2 rounded-2xl border border-app-line bg-app-surface p-3 sm:w-auto">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-app-muted">
          {weekday(post.date)} · {post.date.slice(5)}
        </span>
        <button
          type="button"
          aria-label="What this post needs"
          onClick={() => setShowDetail((v) => !v)}
          className="text-app-muted transition-colors duration-200 hover:text-app-ink"
        >
          <Info aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {/* 9:16 frame — the shape it posts in. */}
      <div className="relative flex aspect-[9/16] flex-col justify-end overflow-hidden rounded-xl bg-app-sunken p-3">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-app-bg/85 px-2 py-0.5 text-[10px] font-medium text-app-ink backdrop-blur-sm">
            {ENGINE_LABELS[post.recommendedEngine] ?? post.recommendedEngine}
          </span>
        </div>
        <p className="text-[13px] font-semibold leading-snug text-app-ink">{post.hookPattern}</p>
        <p className="mt-1 text-[11px] text-app-muted">
          {post.requiredUploads.length > 0
            ? `Your footage: ${post.requiredUploads.map((a) => a.label).join(', ')}`
            : 'We supply everything for this one'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-app-sunken px-2 py-0.5 text-[10px] font-medium text-app-ink">{post.pillarName}</span>
        <span className="text-[10px] text-app-muted">{channels.join(' + ')}</span>
      </div>

      <p className="text-[12px] font-medium text-app-ink">{post.templateName}</p>

      {editing ? (
        <textarea
          autoFocus
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          className="w-full rounded-lg border border-app-line bg-app-bg px-2 py-1.5 text-[12px] text-app-ink"
          placeholder="Write the caption for this post"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-start gap-1.5 text-left text-[12px] text-app-muted transition-colors duration-200 hover:text-app-ink"
        >
          <Pencil aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{saving ? 'Saving…' : post.caption?.trim() || 'Add a caption'}</span>
        </button>
      )}

      {showDetail && (
        <div className="flex flex-col gap-1 rounded-lg bg-app-sunken p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">Needs</p>
          {post.assetRequirements.map((a) => (
            <p key={a.kind} className="text-[11px] text-app-ink">
              {a.label}
              <span className="text-app-muted">
                {' · '}
                {a.fulfilment === 'upload' ? 'you supply' : a.fulfilment === 'generate' ? 'we generate' : 'from library'}
                {!a.required && ' · optional'}
              </span>
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

export function CampaignReviewStep({ posts, channels, savingPostId, onCaption }: Props) {
  const live = posts.filter((p) => !p.skipped);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-medium text-app-ink">Review your campaign</p>
        <p className="text-[12px] text-app-muted">{live.length} posts · swipe to see them all</p>
      </div>

      {/* Phone: one swipeable row. Desktop: a grid. */}
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
        {live.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            channels={channels}
            saving={savingPostId === post.id}
            onCaption={(caption) => onCaption(post.id, caption)}
          />
        ))}
      </div>
    </div>
  );
}
