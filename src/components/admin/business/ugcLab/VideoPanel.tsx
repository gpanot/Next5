'use client';

import { useState } from 'react';
import {
  UGC_CONFIRM_ABOVE_USD, UGC_DURATIONS, UGC_PROVIDERS, UGC_PROVIDER_ORDER, UGC_RESOLUTION, estimateSeedanceUsd, type UgcDuration,
} from '../../../../config/ugcLab';
import type { UgcCharacterDto, UgcVideoDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import { EmptyState, ErrorLine, MediaGridSkeleton, Notice, Pill, PrimaryButton, SecondaryButton, Section, Spinner, usd } from './ui';
import { VideoCard } from './VideoCard';
import { useUgcVideos } from './useUgcVideos';

export type VideoSelection = { character: UgcCharacterDto; script: string; duration: UgcDuration };

type VideoPanelProps = {
  token: string;
  selection: VideoSelection | null;
  onOpenLibrary: () => void;
};

const RECENT_COUNT = 6;

type GenerateResponse = { video?: UgcVideoDto; estimated_cost_usd?: number };

export function VideoPanel({ token, selection, onOpenLibrary }: VideoPanelProps) {
  const { videos, etas, error, loading, reload, add, update, remove } = useUgcVideos(token);
  const isPhoto = selection?.character.kind === 'photo';
  const [durationChoice, setDurationChoice] = useState<UgcDuration>(selection?.duration ?? 8);
  // Photo scripts are written for one length; AI characters speak the hook at any length.
  const duration = isPhoto && selection ? selection.duration : durationChoice;
  const cost = estimateSeedanceUsd(duration);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmCost, setConfirmCost] = useState<number | null>(null);

  async function submit(confirmOverBudget: boolean) {
    if (!selection) return;
    setSubmitting(true);
    setSubmitError('');
    setConfirmCost(null);
    const res = await ugcRequest<GenerateResponse>(token, '/api/admin/ugc-lab/generate', {
      json: { characterId: selection.character.id, script: selection.script, duration, confirmOverBudget },
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

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Generate video"
        description={`${UGC_PROVIDER_ORDER.map((p) => UGC_PROVIDERS[p].shortLabel).join(', then ')} · ${UGC_RESOLUTION} while testing · ${usd(estimateSeedanceUsd(8))}–${usd(UGC_PROVIDERS.reapi.usdPerSecond * 8)} for 8 s`}
      >
        {!selection ? (
          <EmptyState title="Pick a character and a script first." hint="Go to Character, choose a photo or an AI character." />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={selection.character.url} alt="Selected character" className="aspect-[9/16] w-24 shrink-0 rounded-xl object-cover ring-1 ring-line" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">
                {isPhoto ? 'Photo · first frame, keeps the place' : 'AI character · look reference'}
              </p>
              {selection.script.trim()
                ? <p className="text-[13px] leading-relaxed text-ink">{selection.script}</p>
                : <p className="text-[13px] text-red-700">No script yet. Pick a hook in Research first.</p>}
              <div className="flex flex-wrap items-center gap-2">
                {isPhoto ? (
                  <span className="text-[12px] text-muted">{duration} s, set by the script</span>
                ) : (
                  UGC_DURATIONS.map((d) => <Pill key={d} active={durationChoice === d} onClick={() => setDurationChoice(d)}>{d} s</Pill>)
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
                    {submitting ? <><Spinner /> Starting…</> : `Generate ${duration} s video · ${usd(cost)}`}
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
