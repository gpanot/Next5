'use client';

import { useState } from 'react';
import { ScriptSheet } from './ScriptSheet';

export type ResearchVideo = {
  id: string;
  video_url: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  /** ISO date the video was posted. Missing on searches cached before dates were added. */
  posted_at?: string | null;
  hook: string;
  raw_transcript: string;
};

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

/** "Mar 4, 2026". Empty when the date is missing or unreadable. */
const formatPostedAt = (iso: string | null | undefined): string => {
  const time = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type ResearchCardProps = { video: ResearchVideo; selected: boolean; onSelect: () => void };

export function ResearchCard({ video, selected, onSelect }: ResearchCardProps) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const postedAt = formatPostedAt(video.posted_at);

  return (
    <article
      className={`flex gap-3 rounded-xl border bg-white p-3 transition-shadow ${selected ? 'border-ink ring-1 ring-ink' : 'border-line'}`}
    >
      <button type="button" onClick={onSelect} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-alt" aria-label={`Use the hook from @${video.author}`}>
        {video.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element -- TikTok cover URL
          <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[12px] text-muted">@{video.author}</span>
          <span className="shrink-0 text-[11px] text-muted tabular-nums">{formatCount(video.views)} views · {formatCount(video.likes)} likes</span>
        </div>
        {postedAt && <span className="text-[11px] text-muted">Posted {postedAt}</span>}
        <button type="button" onClick={onSelect} className="text-left text-[13px] leading-snug text-ink line-clamp-3">
          {video.hook || <span className="italic text-subtle">No hook found</span>}
        </button>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <button type="button" onClick={() => setScriptOpen(true)} className="min-h-8 text-ink underline">
            See script
          </button>
          {video.video_url && (
            <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="min-h-8 leading-8 text-ink underline">
              Open on TikTok
            </a>
          )}
        </div>
      </div>
      {scriptOpen && (
        <ScriptSheet
          author={video.author}
          hook={video.hook}
          script={video.raw_transcript}
          onUseHook={() => { onSelect(); setScriptOpen(false); }}
          onClose={() => setScriptOpen(false)}
        />
      )}
    </article>
  );
}
