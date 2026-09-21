'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { ResearchCard, type ResearchVideo } from './ResearchCard';
import {
  addToHistory, ago, clearResearch, groupByDay, readHistory, readResearch, writeResearch,
  type DayGroup, type ResearchCache, type SearchEntry,
} from './researchCache';
import { ScriptFlowView } from './ScriptFlowView';
import {
  EmptyState, Notice, PrimaryButton, SecondaryButton, Section, Skeleton, Spinner,
  fieldClass, labelClass,
} from './ui';
import { useScriptFlow, type ScriptReady } from './useScriptFlow';
import { errorOf, ugcRequest } from './api';

type HookPanelProps = {
  token: string;
  /** The character already selected in the Character step. */
  character: UgcCharacterDto | null;
  /**
   * Called when the user confirms a script.
   * @param ready - the script, character and duration
   * @param hookText - the original hook phrase (shorter than the full script)
   */
  onReady: (ready: ScriptReady, hookText: string) => void;
};

/**
 * Step 2 of the UGC Lab flow: Research → select a hook → generate 3 scripts.
 *
 * Sub-steps:
 *   1. Research  — enter a niche, pull 10 TikTok hooks. Recalls permanent history.
 *   2. Select    — pick a hook from the results (or type one directly).
 *   3. Generate  — produce 3 script lengths; pick one to move to Video.
 */
export function HookPanel({ token, character, onReady }: HookPanelProps) {
  // ── Research state ──────────────────────────────────────────────────────────
  const [cached] = useState(readResearch);
  const [industry, setIndustry] = useState(cached?.industry ?? '');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [videos, setVideos] = useState<ResearchVideo[] | null>(cached?.videos ?? null);
  const [selectedVideoId, setSelectedVideoId] = useState(cached?.selectedId ?? '');
  const [searchedAt, setSearchedAt] = useState(cached?.at ?? '');

  // ── History state ───────────────────────────────────────────────────────────
  const [history, setHistory] = useState<SearchEntry[]>(() => readHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // ── Hook editing state ──────────────────────────────────────────────────────
  const [hookText, setHookText] = useState(cached?.editedHook ?? '');

  // ── Script flow (describe + write scripts) ──────────────────────────────────
  const flow = useScriptFlow(token, hookText, () => undefined);

  const remember = (next: Partial<ResearchCache>) => {
    const base: ResearchCache = {
      industry,
      videos: videos ?? [],
      selectedId: selectedVideoId,
      editedHook: hookText,
      at: searchedAt || new Date().toISOString(),
    };
    writeResearch({ ...base, ...next });
  };

  const pickVideo = (video: ResearchVideo) => {
    setSelectedVideoId(video.id);
    setHookText(video.hook);
    remember({ selectedId: video.id, editedHook: video.hook });
  };

  const editHook = (text: string) => {
    setHookText(text);
    remember({ editedHook: text });
  };

  const startOver = () => {
    setVideos(null);
    setSelectedVideoId('');
    setHookText('');
    setSearchedAt('');
    flow.reset();
    clearResearch();
  };

  async function search() {
    if (!industry.trim()) return;
    setSearching(true);
    setSearchError('');
    setVideos(null);
    setSelectedVideoId('');
    const res = await ugcRequest<{ videos?: ResearchVideo[] }>(token, '/api/admin/ugc-lab/research', {
      json: { industry },
    }).catch(() => null);
    setSearching(false);
    if (!res?.ok) {
      setSearchError(res ? errorOf(res) : 'Search failed');
      return;
    }
    const found = res.data.videos ?? [];
    const at = new Date().toISOString();
    setVideos(found);
    setSearchedAt(at);
    writeResearch({ industry, videos: found, selectedId: '', editedHook: '', at });
    // Persist to history so it can be recalled later without re-running the search.
    if (found.length > 0) {
      addToHistory({ at, industry, videos: found });
      setHistory(readHistory());
    }
  }

  async function generateScripts() {
    if (!hookText.trim()) return;
    if (!character) {
      flow.setError('Go back to the Character step and pick a character first.');
      return;
    }
    await flow.chooseWithHook(character, hookText);
  }

  const hasScripts = flow.scripts.length > 0;
  const showGenerateButton = hookText.trim() && !flow.busy && !hasScripts;
  const dayGroups: DayGroup[] = groupByDay(history);

  return (
    <Section
      title="Hook"
      description="Research viral hooks from TikTok, pick one, then generate 3 script lengths."
    >
      <div className="flex flex-col gap-6">
        {/* ── Sub-step 1: Research ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-widest text-muted">1 · Research</p>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => { e.preventDefault(); void search(); }}
          >
            <label className={`${labelClass} flex-1`}>
              Niche
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. real estate agent, fitness, SaaS"
                className={fieldClass}
              />
            </label>
            <PrimaryButton type="submit" disabled={searching || !industry.trim()}>
              {searching ? <><Spinner /> Searching…</> : 'Search'}
            </PrimaryButton>
          </form>

          {!searching && videos && videos.length > 0 && searchedAt && (
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
              <span>
                Last search{industry ? ` for "${industry}"` : ''} · {videos.length} video{videos.length !== 1 ? 's' : ''} · {ago(searchedAt)}
              </span>
              <SecondaryButton onClick={startOver}>Clear</SecondaryButton>
            </div>
          )}
          {searchError && <p className="text-[13px] text-red-700">{searchError}</p>}
          {searching && (
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
                  selected={selectedVideoId === v.id}
                  onSelect={() => pickVideo(v)}
                />
              ))}
            </div>
          )}

          {/* ── Permanent search history ────────────────────────────────── */}
          {history.length > 0 && (
            <div className="mt-2 rounded-xl border border-line">
              {/* Header row — toggle open/close */}
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setHistoryOpen((o) => !o)}
              >
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Past searches ({history.length})
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${historyOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {historyOpen && (
                <div className="border-t border-line px-4 pb-4 pt-3">
                  <div className="flex flex-col gap-5">
                    {dayGroups.map(({ day, searches }) => (
                      <div key={day} className="flex flex-col gap-2">
                        {/* Day label */}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">{day}</p>

                        {/* Searches within this day */}
                        {searches.map((entry: SearchEntry) => {
                          const isExpanded = expandedEntryId === entry.id;
                          return (
                            <div key={entry.id} className="rounded-lg border border-line overflow-hidden">
                              {/* Entry header — click to expand / collapse */}
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-alt transition-colors"
                                onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                              >
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="text-[13px] font-medium text-ink">"{entry.industry}"</span>
                                  <span className="text-[12px] text-muted">
                                    · {entry.videos.length} video{entry.videos.length !== 1 ? 's' : ''} · {ago(entry.at)}
                                  </span>
                                </span>
                                <svg
                                  className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                                >
                                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>

                              {/* Expanded: show video grid — click a card to select its hook */}
                              {isExpanded && (
                                <div className="border-t border-line px-3 pb-3 pt-3">
                                  <p className="mb-2 text-[11px] text-muted">
                                    Click any video to use its hook ↓
                                  </p>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {entry.videos.map((v) => (
                                      <ResearchCard
                                        key={v.id || v.video_url}
                                        video={v}
                                        selected={selectedVideoId === v.id}
                                        onSelect={() => {
                                          pickVideo(v);
                                          setExpandedEntryId(null); // collapse after picking
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sub-step 2: Edit / type hook ─────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <p className="text-[11px] uppercase tracking-widest text-muted">2 · Select or write your hook</p>
          <label className={labelClass}>
            Hook
            <textarea
              value={hookText}
              onChange={(e) => editHook(e.target.value)}
              rows={3}
              placeholder="Pick one above, or write your own opening line…"
              className={`${fieldClass} resize-none`}
            />
          </label>
        </div>

        {/* ── Sub-step 3: Generate scripts ─────────────────────────────── */}
        {hookText.trim() && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="text-[11px] uppercase tracking-widest text-muted">3 · Generate scripts by length</p>

            {!character && (
              <Notice>
                <p>Go back to the Character step and pick a character first — the scripts are tailored to the scene.</p>
              </Notice>
            )}

            {showGenerateButton && character && (
              <div>
                <PrimaryButton onClick={() => void generateScripts()}>
                  Generate 3 scripts for this hook
                </PrimaryButton>
              </div>
            )}

            <ScriptFlowView flow={flow} onReady={(ready) => onReady(ready, hookText)} />
          </div>
        )}
      </div>
    </Section>
  );
}
