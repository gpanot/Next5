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
import { ResearchCard, type ResearchVideo } from '../ugcLab/ResearchCard';
import {
  addToHistory,
  clearHistory,
  clearResearchFor,
  readHistory,
  readResearchFor,
  writeResearchFor,
  ago,
  type ResearchCache,
  type SearchEntry,
} from '../ugcLab/researchCache';
import { SearchHistory } from '../ugcLab/SearchHistory';
import { useLabClient, errorOf } from '../ugcLab/api';
import { useContentTemplates } from './useContentTemplates';
import { getNicheSlides, type NicheSlide } from '../../../lib/nicheSlides';
import {
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  Spinner,
  fieldClass,
  labelClass,
} from '../ugcLab/ui';

export type { ResearchVideo };
export type { NicheSlide };

export type ResearcherProps = {
  /** localStorage key — unique per host tab so caches are independent. */
  cacheKey: string;
  /** Label for the per-card action button, e.g. "Use as inspiration". */
  actionLabel: string;
  /**
   * Called when the user clicks the action button on a card. May be async.
   * `slides` carries the niche-specific copy generated for this video, when it
   * could be produced — hosts that do not build slideshows can ignore it.
   */
  onAction: (video: ResearchVideo, slides?: NicheSlide[]) => void | Promise<void>;
  /**
   * When true, the action waits for niche-specific slide copy before firing, so
   * the host receives ready-to-post text instead of template placeholders.
   */
  withSlides?: boolean;
  /** Set to the video.id currently being actioned to show a per-card loading spinner. */
  actionLoadingId?: string | null;
};

export function Researcher({
  cacheKey,
  actionLabel,
  onAction,
  actionLoadingId,
  withSlides = false,
}: ResearcherProps) {
  const [cached] = useState(() => readResearchFor(cacheKey));
  const [keyword, setKeyword] = useState(cached?.industry ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<ResearchVideo[] | null>(cached?.videos ?? null);
  const [searchedAt, setSearchedAt] = useState(cached?.at ?? '');
  /**
   * The niche the shown results belong to. Kept separate from `keyword`, which
   * changes on every keystroke — slide copy must follow the results, not the input.
   */
  const [searchedNiche, setSearchedNiche] = useState(cached?.industry ?? '');
  /** Set while this component is generating slide copy for a card. */
  const [slidesLoadingId, setSlidesLoadingId] = useState<string | null>(null);
  /** Permanent search history — shared across every tab that researches. */
  const [history, setHistory] = useState<SearchEntry[]>(() => readHistory());
  const client = useLabClient();
  const { resolve: resolveTemplateFor } = useContentTemplates();

  async function handleAction(video: ResearchVideo, cardNiche: string) {
    if (!withSlides || !cardNiche.trim()) {
      await onAction(video);
      return;
    }
    const id = video.id || video.video_url;
    setSlidesLoadingId(id);
    const result = await getNicheSlides(client, {
      niche: cardNiche,
      templateId: resolveTemplateFor(video.template_id, video.hook)?.legacyId ?? 0,
      videoId: id,
      hook: video.hook,
      transcript: video.raw_transcript,
    }).catch(() => null);
    setSlidesLoadingId(null);
    await onAction(video, result?.slides);
  }

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
    setSearchedNiche('');
    setError('');
    clearResearchFor(cacheKey);
  };

  async function search() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError('');
    setVideos(null);
    const res = await client.request<{ videos?: ResearchVideo[] }>('/ugc-lab/research',
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
    setSearchedNiche(keyword.trim());
    remember({ industry: keyword, videos: found, at });
    // Keep it permanently: a search costs ~20 s and a TikTok API call.
    if (found.length > 0) {
      addToHistory({ at, industry: keyword.trim(), videos: found });
      setHistory(readHistory());
    }
  }

  /** One result card, used by both the live grid and the history grid. */
  const renderCard = (video: ResearchVideo, cardNiche: string) => {
    const id = video.id || video.video_url;
    const isActioning = actionLoadingId === video.id || slidesLoadingId === id;
    const isBusy = actionLoadingId != null || slidesLoadingId != null;
    return (
      <ResearchCard
        key={id}
        video={video}
        selected={false}
        onSelect={() => undefined}
        niche={cardNiche}
        renderAction={
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleAction(video, cardNiche)}
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
  };

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
            {videos.length} result{videos.length !== 1 ? 's' : ''} for &ldquo;{searchedNiche}&rdquo; · {ago(searchedAt)}
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
          {videos.map((v) => renderCard(v, searchedNiche))}
        </div>
      )}

      <SearchHistory
        entries={history}
        hint={`Results are kept here permanently — ${actionLabel.toLowerCase()} without re-running the search.`}
        onClear={() => { clearHistory(); setHistory([]); }}
        renderCard={(v, entry) => renderCard(v, entry.industry)}
      />
    </div>
  );
}
