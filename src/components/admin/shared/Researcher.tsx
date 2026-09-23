'use client';

/**
 * Researcher — reusable TikTok research widget.
 *
 * Renders a keyword input + search button + results grid. Each card exposes
 * a configurable action button whose label and callback are supplied by the
 * host tab, making this component usable in:
 *   - UGC Lab ResearchPanel  ("Use this hook")
 *   - Blitz Slideshow tab    ("Use as inspiration")
 *   - UGC Clone tab          ("Use as source")
 *
 * State is cached in localStorage under `cacheKey` so switching tabs doesn't
 * lose the last search.
 */

import { useState } from 'react';
import { ResearchCard, type ResearchVideo } from '../business/ugcLab/ResearchCard';
import {
  clearResearchFor,
  readResearchFor,
  writeResearchFor,
  ago,
  type ResearchCache,
} from '../business/ugcLab/researchCache';
import { ugcRequest, errorOf } from '../business/ugcLab/api';
import {
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  Spinner,
  fieldClass,
  labelClass,
} from '../business/ugcLab/ui';

export type { ResearchVideo };

export type ResearcherProps = {
  token: string;
  /** localStorage key — unique per host tab so caches are independent. */
  cacheKey: string;
  /** Label for the per-card action button, e.g. "Use as inspiration". */
  actionLabel: string;
  /** Called when the user clicks the action button on a card. May be async. */
  onAction: (video: ResearchVideo) => void | Promise<void>;
  /** Set to the video.id currently being actioned to show a per-card loading spinner. */
  actionLoadingId?: string | null;
};

export function Researcher({
  token,
  cacheKey,
  actionLabel,
  onAction,
  actionLoadingId,
}: ResearcherProps) {
  const [cached] = useState(() => readResearchFor(cacheKey));
  const [keyword, setKeyword] = useState(cached?.industry ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<ResearchVideo[] | null>(cached?.videos ?? null);
  const [searchedAt, setSearchedAt] = useState(cached?.at ?? '');

  const remember = (next: Partial<ResearchCache>) => {
    const base: ResearchCache = {
      industry: keyword,
      videos: videos ?? [],
      selectedId: '',
      editedHook: '',
      at: searchedAt || new Date().toISOString(),
    };
    writeResearchFor(cacheKey, { ...base, ...next });
  };

  const startOver = () => {
    setVideos(null);
    setSearchedAt('');
    setError('');
    clearResearchFor(cacheKey);
  };

  async function search() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError('');
    setVideos(null);
    const res = await ugcRequest<{ videos?: ResearchVideo[] }>(
      token,
      '/api/admin/ugc-lab/research',
      { json: { industry: keyword } },
    ).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      setError(res ? errorOf(res) : 'Search failed');
      return;
    }
    const found = res.data.videos ?? [];
    const at = new Date().toISOString();
    setVideos(found);
    setSearchedAt(at);
    remember({ industry: keyword, videos: found, at });
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => { e.preventDefault(); void search(); }}
      >
        <label className={`${labelClass} flex-1`}>
          Niche / keyword
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. auto mechanic, steel distributor, SaaS"
            className={fieldClass}
          />
        </label>
        <PrimaryButton type="submit" disabled={loading || !keyword.trim()}>
          {loading ? <><Spinner /> Searching…</> : 'Search TikTok'}
        </PrimaryButton>
      </form>

      {!loading && videos && videos.length > 0 && searchedAt && (
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
          <span>
            {videos.length} result{videos.length !== 1 ? 's' : ''} for &ldquo;{keyword}&rdquo; · {ago(searchedAt)}
          </span>
          <SecondaryButton onClick={startOver}>Clear</SecondaryButton>
        </div>
      )}

      {error && <p className="text-[13px] text-red-700">{error}</p>}

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[136px]" />)}
        </div>
      )}

      {!loading && videos?.length === 0 && (
        <EmptyState title="No videos found." hint="Try a broader niche or different keyword." />
      )}

      {!loading && videos && videos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const isActioning = actionLoadingId === v.id;
            return (
              <ResearchCard
                key={v.id || v.video_url}
                video={v}
                selected={false}
                onSelect={() => undefined}
                renderAction={
                  <button
                    type="button"
                    disabled={isActioning || actionLoadingId != null}
                    onClick={() => void onAction(v)}
                    className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {isActioning && (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {actionLabel}
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
