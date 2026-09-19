'use client';

import { useState } from 'react';
import { errorOf, ugcRequest } from './api';
import { ResearchCard, type ResearchVideo } from './ResearchCard';
import { ago, clearResearch, readResearch, writeResearch, type ResearchCache } from './researchCache';
import { EmptyState, PrimaryButton, SecondaryButton, Section, Skeleton, Spinner, fieldClass, labelClass } from './ui';

type ResearchPanelProps = {
  token: string;
  onHookSelected: (hook: string) => void;
};

export function ResearchPanel({ token, onHookSelected }: ResearchPanelProps) {
  // The last search comes back with the panel, so leaving this tab does not cost another search.
  const [cached] = useState(readResearch);
  const [industry, setIndustry] = useState(cached?.industry ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<ResearchVideo[] | null>(cached?.videos ?? null);
  const [selectedId, setSelectedId] = useState(cached?.selectedId ?? '');
  const [editedHook, setEditedHook] = useState(cached?.editedHook ?? '');
  const [searchedAt, setSearchedAt] = useState(cached?.at ?? '');

  const remember = (next: Partial<ResearchCache>) => {
    const base = { industry, videos: videos ?? [], selectedId, editedHook, at: searchedAt || new Date().toISOString() };
    writeResearch({ ...base, ...next });
  };

  const pick = (video: ResearchVideo) => {
    setSelectedId(video.id);
    setEditedHook(video.hook);
    remember({ selectedId: video.id, editedHook: video.hook });
  };

  const editHook = (text: string) => {
    setEditedHook(text);
    remember({ editedHook: text });
  };

  const startOver = () => {
    setVideos(null);
    setSelectedId('');
    setEditedHook('');
    setSearchedAt('');
    clearResearch();
  };

  async function search() {
    if (!industry.trim()) return;
    setLoading(true);
    setError('');
    setVideos(null);
    setSelectedId('');
    const res = await ugcRequest<{ videos?: ResearchVideo[] }>(token, '/api/admin/ugc-lab/research', { json: { industry } }).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      setError(res ? errorOf(res) : 'Search failed');
      return;
    }
    const found = res.data.videos ?? [];
    const at = new Date().toISOString();
    setVideos(found);
    setSearchedAt(at);
    writeResearch({ industry, videos: found, selectedId: '', editedHook: '', at });
  }

  return (
    <Section title="Research hooks" description="Enter a niche. We pull 10 TikTok videos, get the full script of each, and pull out its opening hook.">
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

      {!loading && videos && videos.length > 0 && searchedAt && (
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span>Your last search{industry ? ` for “${industry}”` : ''} · {videos.length} video{videos.length === 1 ? '' : 's'} · {ago(searchedAt)}</span>
          <SecondaryButton onClick={startOver}>Clear</SecondaryButton>
        </div>
      )}
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
              onSelect={() => pick(v)}
            />
          ))}
        </div>
      )}

      {selectedId && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label className={labelClass}>
            Edit the hook
            <textarea value={editedHook} onChange={(e) => editHook(e.target.value)} rows={3} className={`${fieldClass} resize-none`} />
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
