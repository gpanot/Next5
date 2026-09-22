'use client';

import { useEffect, useState } from 'react';
import {
  UGC_CONFIRM_ABOVE_USD, UGC_RESOLUTIONS, UGC_VIDEO_MODELS,
  estimateVideoUsd,
  type UgcDuration, type UgcResolution, type UgcVideoModel,
} from '../../../../config/ugcLab';
import type { UgcCharacterDto, UgcVideoDto } from '../../../../types/admin/ugc';
import { assemblePromptFromContext, buildPromptForCharacter } from '../../../../lib/ugcPromptClient';
import { errorOf, ugcRequest } from './api';
import { EmptyState, ErrorLine, MediaGridSkeleton, Notice, PrimaryButton, SecondaryButton, Section, Spinner, fieldClass, labelClass, usd } from './ui';
import { VideoCard } from './VideoCard';
import { useUgcVideos } from './useUgcVideos';

export type VideoSelection = {
  character: UgcCharacterDto;
  script: string;
  duration: UgcDuration;
  /** AI-suggested scene context (sentences 1-3) for the Seedance / Wan3 prompt. Absent in the "Use this Hook" fast path. */
  suggestedVideoContext?: string;
  /** Niche / industry entered in the Hook step (e.g. "real estate agent", "fitness"). */
  industry?: string;
  /** The original hook phrase — shorter than the full 24 s script. */
  hookText?: string;
};

type VideoPanelProps = {
  token: string;
  selection: VideoSelection | null;
  voiceKey?: string | null;
  onOpenLibrary: () => void;
};

const RECENT_COUNT = 6;

type GenerateResponse = { video?: UgcVideoDto; estimated_cost_usd?: number };

/** Builds the default Seedance prompt from the current selection, using the AI-suggested context when available. */
const getDefaultPrompt = (sel: VideoSelection): string => {
  if (sel.suggestedVideoContext) {
    return assemblePromptFromContext(sel.suggestedVideoContext, sel.script);
  }
  return buildPromptForCharacter(
    sel.character.kind,
    sel.script,
    sel.character.scene,
    sel.character.portraitJson ?? null,
  );
};

export function VideoPanel({ token, selection, voiceKey, onOpenLibrary }: VideoPanelProps) {
  const { videos, etas, error, loading, reload, add, update, remove } = useUgcVideos(token);
  const isPhoto = selection?.character.kind === 'photo';
  const isAvatar = selection?.character.kind === 'avatar';
  const duration: UgcDuration = selection?.duration ?? 8;

  // Model + resolution state
  const [videoModel, setVideoModel] = useState<UgcVideoModel>('seedance');
  const [resolution, setResolution] = useState<UgcResolution>('480p');

  const cost = estimateVideoUsd(videoModel, resolution, duration);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmCost, setConfirmCost] = useState<number | null>(null);

  // Editable video generation prompt — pre-filled from AI-suggested context or the hard-coded builder.
  const [customPrompt, setCustomPrompt] = useState(() => (selection ? getDefaultPrompt(selection) : ''));
  useEffect(() => {
    setCustomPrompt(selection ? getDefaultPrompt(selection) : '');
  }, [selection]);

  const defaultPrompt = selection ? getDefaultPrompt(selection) : '';
  const isEdited = customPrompt !== defaultPrompt;

  // "Update Prompt" — regenerate scene context via GPT-4o-mini then reassemble
  const [updatingPrompt, setUpdatingPrompt] = useState(false);
  const [updatePromptError, setUpdatePromptError] = useState('');

  async function updatePrompt() {
    if (!selection) return;
    setUpdatingPrompt(true);
    setUpdatePromptError('');
    const res = await ugcRequest<{ context?: string }>(token, '/api/admin/ugc-lab/suggest-prompt', {
      json: {
        hook: selection.hookText ?? selection.script,
        industry: selection.industry ?? '',
        scene: selection.character.scene ?? null,
        portraitJson: selection.character.portraitJson ?? null,
      },
    }).catch(() => null);
    setUpdatingPrompt(false);
    if (!res?.ok || !res.data.context) {
      setUpdatePromptError(res ? errorOf(res) : 'Could not generate prompt');
      return;
    }
    setCustomPrompt(assemblePromptFromContext(res.data.context, selection.script));
  }

  async function submit(confirmOverBudget: boolean) {
    if (!selection) return;
    setSubmitting(true);
    setSubmitError('');
    setConfirmCost(null);
    const res = await ugcRequest<GenerateResponse>(token, '/api/admin/ugc-lab/generate', {
      json: {
        characterId: selection.character.id,
        script: selection.script,
        duration,
        confirmOverBudget,
        videoModel,
        resolution,
        ...(voiceKey ? { voiceKey } : {}),
        ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {}),
      },
    }).catch(() => null);
    setSubmitting(false);
    if (res?.status === 402 && res.data.error === 'budget_exceeded') {
      setConfirmCost(res.data.estimated_cost_usd ?? cost);
      return;
    }
    if (!res?.ok || !res.data.video) {
      setSubmitError(res ? errorOf(res) : 'Could not start the video');
      return;
    }
    add(res.data.video);
  }

  const characterLabel =
    isAvatar ? 'Your Avatar · first frame, portrait-locked'
    : isPhoto ? 'Photo · first frame, keeps the place'
    : 'AI character · look reference';

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Generate video"
        description="Pick a model and resolution, then generate. 9:16 aspect ratio · audio included."
      >
        {!selection ? (
          <EmptyState title="Pick a character and a script first." hint="Use the Character and Hook steps to set up your video." />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={selection.character.url} alt="Selected character" className="aspect-[9/16] w-24 shrink-0 rounded-xl object-cover ring-1 ring-line" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">
                {characterLabel}
              </p>
              {voiceKey && (
                <p className="text-[11px] uppercase tracking-widest text-emerald-700">
                  Custom voice attached
                </p>
              )}
              {selection.script.trim()
                ? <p className="text-[13px] leading-relaxed text-ink">{selection.script}</p>
                : <p className="text-[13px] text-red-700">No script yet. Go back to the Hook step.</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[12px] text-muted">{duration} s, set by the script</span>
                {selection.industry && (
                  <span className="text-[12px] text-muted">
                    Niche: <span className="font-medium text-ink">{selection.industry}</span>
                  </span>
                )}
              </div>

              {/* Model + Resolution selectors */}
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Model</label>
                  <select
                    value={videoModel}
                    onChange={(e) => setVideoModel(e.target.value as UgcVideoModel)}
                    className={`${fieldClass} min-w-[160px]`}
                  >
                    {(Object.keys(UGC_VIDEO_MODELS) as UgcVideoModel[]).map((m) => (
                      <option key={m} value={m}>{UGC_VIDEO_MODELS[m].label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as UgcResolution)}
                    className={`${fieldClass} min-w-[100px]`}
                  >
                    {UGC_RESOLUTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Estimated cost</label>
                  <p className="flex h-9 items-center text-[13px] font-medium text-ink">{usd(cost)} for {duration} s</p>
                </div>
              </div>

              {/* Editable video generation prompt */}
              <div className="flex flex-col gap-1.5">
                {/* Label row: name + badges on the left, actions on the right */}
                <div className="flex items-center justify-between gap-2">
                  <label className={labelClass}>
                    Video generation prompt
                    {selection.suggestedVideoContext && (
                      <span className="ml-1 text-[10px] text-emerald-700 normal-case font-normal">✦ AI-suggested</span>
                    )}
                  </label>
                  <div className="flex shrink-0 items-center gap-3">
                    {isEdited && (
                      <button
                        type="button"
                        onClick={() => setCustomPrompt(defaultPrompt)}
                        className="text-[11px] text-muted underline hover:text-ink"
                      >
                        Reset
                      </button>
                    )}
                    <SecondaryButton
                      onClick={() => void updatePrompt()}
                      disabled={updatingPrompt}
                    >
                      {updatingPrompt ? <><Spinner /> Updating…</> : '✦ Update Prompt'}
                    </SecondaryButton>
                  </div>
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={6}
                  className={`${fieldClass} resize-y text-[11px] leading-relaxed`}
                />
                {updatePromptError && (
                  <p className="text-[12px] text-red-700">{updatePromptError}</p>
                )}
              </div>

              {confirmCost !== null ? (
                <Notice>
                  <p>This video costs {usd(confirmCost)}, above the {usd(UGC_CONFIRM_ABOVE_USD)} test limit.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => void submit(true)}>Spend {usd(confirmCost)}</PrimaryButton>
                    <SecondaryButton onClick={() => setConfirmCost(null)}>Cancel</SecondaryButton>
                  </div>
                </Notice>
              ) : (
                <div>
                  <PrimaryButton onClick={() => void submit(false)} disabled={submitting || !selection.script.trim()}>
                    {submitting
                      ? <><Spinner /> Starting…</>
                      : `Generate ${duration} s · ${UGC_VIDEO_MODELS[videoModel].label} ${resolution} · ${usd(cost)}`}
                  </PrimaryButton>
                </div>
              )}
              {submitError && <p className="text-[13px] text-red-700">{submitError}</p>}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Recent videos"
        description="Saved automatically. They stay available after a refresh."
        actions={<SecondaryButton onClick={onOpenLibrary}>Open library</SecondaryButton>}
      >
        {loading && <MediaGridSkeleton count={3} />}
        {error && <ErrorLine message={error} onRetry={reload} />}
        {!loading && !error && videos.length === 0 && <EmptyState title="No videos yet." />}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.slice(0, RECENT_COUNT).map((v) => (
              <VideoCard key={v.id} token={token} video={v} eta={etas[v.durationSec]} onChange={update} onDelete={remove} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
