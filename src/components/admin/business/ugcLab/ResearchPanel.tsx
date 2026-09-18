'use client';

import { useState } from 'react';
import { errorOf, ugcRequest } from './api';
import { EmptyState, PrimaryButton, Section, Skeleton, Spinner, fieldClass, labelClass } from './ui';

export type ResearchVideo = {
  id: string;
  video_url: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  hook: string;
  raw_transcript: string;
};

type ResearchPanelProps = {
  token: string;
  onHookSelected: (hook: string) => void;
};

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

const ResearchCard = ({ video, selected, onSelect }: { video: ResearchVideo; selected: boolean; onSelect: () => void }) => (
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
      <button type="button" onClick={onSelect} className="text-left text-[13px] leading-snug text-ink line-clamp-3">
        {video.hook || <span className="italic text-subtle">No hook found</span>}
      </button>
      {video.video_url && (
        <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="self-start text-[12px] text-ink underline">
          Open on TikTok
        </a>
      )}
    </div>
  </article>
);

export function ResearchPanel({ token, onHookSelected }: ResearchPanelProps) {
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<ResearchVideo[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [editedHook, setEditedHook] = useState('');

  async function search() {
    if (!industry.trim()) return;
    setLoading(true);
    setError('');
    setVideos(null);
    setSelectedId('');
    const res = await ugcRequest<{ videos?: ResearchVideo[] }>(token, '/api/admin/ugc-lab/research', { json: { industry } }).catch(() => null);
    setLoading(false);
    if (res?.ok) setVideos(res.data.videos ?? []);
    else setError(res ? errorOf(res) : 'Search failed');
  }

  return (
    <Section title="Research hooks" description="Enter a niche. We pull 10 TikTok videos and pull the opening hook from each.">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => { e.preventDefault(); void search(); }}
      >
        <label className={`${labelClass} flex-1`}>
          Niche
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. real estate agent, fitness, SaaS" className={fieldClass} />
        </label>
        <PrimaryButton type="submit" disabled={loading || !industry.trim()}>
          {loading ? <><Spinner /> Searching…</> : 'Search'}
        </PrimaryButton>
      </form>

      {error && <p className="text-[13px] text-red-700">{error}</p>}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[136px]" />)}
        </div>
      )}
      {videos?.length === 0 && <EmptyState title="No videos found." hint="Try a broader niche." />}

      {videos && videos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <ResearchCard
              key={v.id || v.video_url}
              video={v}
              selected={selectedId === v.id}
              onSelect={() => { setSelectedId(v.id); setEditedHook(v.hook); }}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label className={labelClass}>
            Edit the hook
            <textarea value={editedHook} onChange={(e) => setEditedHook(e.target.value)} rows={3} className={`${fieldClass} resize-none`} />
          </label>
          <div>
            <PrimaryButton onClick={() => editedHook.trim() && onHookSelected(editedHook.trim())} disabled={!editedHook.trim()}>
              Use this hook
            </PrimaryButton>
          </div>
        </div>
      )}
    </Section>
  );
}
