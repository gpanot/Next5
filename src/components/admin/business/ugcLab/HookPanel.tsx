'use client';

import { useState } from 'react';
import type { UgcCharacterDto } from '../../../../types/admin/ugc';
import { ResearchCard, type ResearchVideo } from './ResearchCard';
import { ago, clearResearch, readResearch, writeResearch, type ResearchCache } from './researchCache';
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
 *   1. Research  — enter a niche, pull 10 TikTok hooks.
 *   2. Select    — pick a hook from the results (or type one directly).
 *   3. Generate  — produce 3 script lengths; pick one to move to Video.
 */
export function HookPanel({ token, character, onReady }: HookPanelProps) {
  // ── Research state ─────────────────────────────────────────────────────────
  const [cached] = useState(readResearch);
  const [industry, setIndustry] = useState(cached?.industry ?? '');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [videos, setVideos] = useState<ResearchVideo[] | null>(cached?.videos ?? null);
  const [selectedVideoId, setSelectedVideoId] = useState(cached?.selectedId ?? '');
  const [searchedAt, setSearchedAt] = useState(cached?.at ?? '');

  // ── Hook editing state ──────────────────────────────────────────────────────
  const [hookText, setHookText] = useState(cached?.editedHook ?? '');

  // ── Script flow (describe + write scripts) ─────────────────────────────────
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
