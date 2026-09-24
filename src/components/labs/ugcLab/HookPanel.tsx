'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { ResearchCard, type ResearchVideo } from './ResearchCard';
import {
  addToHistory, ago, clearHistory, clearResearch, readHistory, readResearch, writeResearch,
  type ResearchCache, type SearchEntry,
} from './researchCache';
import { SearchHistory } from './SearchHistory';
import { ScriptFlowView } from './ScriptFlowView';
import {
  EmptyState, Notice, PrimaryButton, SecondaryButton, Section, Skeleton, Spinner,
  fieldClass, labelClass,
} from './ui';
import { useScriptFlow, type ScriptReady } from './useScriptFlow';
import { errorOf, useLabClient } from './api';
import { IdcNichePicker } from '../studio/runs/IdcNichePicker';

type HookPanelProps = {
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
 *   1. Research  — enter a niche (or tap a run's IDC niche), pull 10 TikTok hooks. Recalls permanent history.
 *   2. Select    — pick a hook from the results (or type one directly).
 *   3. Generate  — produce 3 script lengths; pick one to move to Video.
 */
export function HookPanel({ character, onReady }: HookPanelProps) {
  const client = useLabClient();
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

  // ── Hook editing state ──────────────────────────────────────────────────────
  const [hookText, setHookText] = useState(cached?.editedHook ?? '');

  // ── Script flow (describe + write scripts) ──────────────────────────────────
  const flow = useScriptFlow(hookText, () => undefined);

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

  /** Searches one niche: the typed one, or an IDC niche passed from the picker. */
  async function search(term: string = industry) {
    const niche = term.trim();
    if (!niche) return;
    setIndustry(niche);
    setSearching(true);
    setSearchError('');
    setVideos(null);
    setSelectedVideoId('');
    const res = await client.request<{ videos?: ResearchVideo[] }>('/ugc-lab/research', {
      json: { industry: niche },
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
    writeResearch({ industry: niche, videos: found, selectedId: '', editedHook: '', at });
    // Persist to history so it can be recalled later without re-running the search.
    if (found.length > 0) {
      addToHistory({ at, industry: niche, videos: found });
      setHistory(readHistory());
    }
  }

  async function generateScripts() {
    if (!hookText.trim()) return;
    if (!character) {
      flow.setError('Go back to the Character step and pick a character first.');
      return;
    }
    await flow.chooseWithHook(character, hookText, industry);
  }

  const hasScripts = flow.scripts.length > 0;
  const showGenerateButton = hookText.trim() && !flow.busy && !hasScripts;

  return (
    <Section
      title="Hook"
      description="Research viral hooks from TikTok, pick one, then generate 3 script lengths."
    >
      <div className="flex flex-col gap-6">
        {/* ── Sub-step 1: Research ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-widest text-muted">1 · Research</p>
          <IdcNichePicker active={industry} busy={searching} onPick={(niche) => void search(niche)} />
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
                  niche={industry}
                />
              ))}
            </div>
          )}

          {/* ── Permanent search history ────────────────────────────────── */}
          <SearchHistory
            entries={history}
            hint="Click any video to use its hook ↓"
            onClear={() => { clearHistory(); setHistory([]); }}
            renderCard={(v, entry) => (
              <ResearchCard
                video={v}
                selected={selectedVideoId === v.id}
                onSelect={() => pickVideo(v)}
                niche={entry.industry}
              />
            )}
          />
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

          {/* ── "Use this Hook" — skip script generation entirely ── */}
          {hookText.trim() && character && (
            <div>
              <PrimaryButton
                onClick={() => onReady({ character, script: hookText, duration: 8, industry: industry || undefined, hookText }, hookText)}
              >
                Use this Hook →
              </PrimaryButton>
            </div>
          )}
          {hookText.trim() && !character && (
            <Notice>
              <p>Go back to the Character step and pick a character first.</p>
            </Notice>
          )}
        </div>

        {/* ── Sub-step 3: Generate scripts (optional) ──────────────────── */}
        {hookText.trim() && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="text-[11px] uppercase tracking-widest text-muted">
              3 · Generate scripts by length
              <span className="ml-2 normal-case text-[10px] text-muted/60">(optional — adds more variety + AI video prompt)</span>
            </p>

            {showGenerateButton && character && (
              <div>
                <SecondaryButton onClick={() => void generateScripts()}>
                  Generate 3 scripts for this hook
                </SecondaryButton>
              </div>
            )}

            <ScriptFlowView flow={flow} onReady={(ready) => onReady({ ...ready, industry: industry || undefined, hookText }, hookText)} />
          </div>
        )}
      </div>
    </Section>
  );
}
