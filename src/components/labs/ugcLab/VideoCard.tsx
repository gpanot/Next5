'use client';

import { useEffect, useRef, useState } from 'react';
import type { UgcEta, UgcVideoDto } from '../../../types/admin/ugc';
import { errorOf, useLabClient } from './api';
import { DangerButton, Pill, SecondaryButton, Spinner, StatusPill, usd } from './ui';

const POLL_MS = 8_000;

type VideoCardProps = {
  video: UgcVideoDto;
  /** Usual generation time for this length, from past videos. */
  eta?: UgcEta;
  onChange: (video: UgcVideoDto) => void;
  onDelete: (id: string) => void;
};

const MODE_LABEL: Record<string, string> = { 'real-person': 'Photo', 'ai-character': 'AI character', imported: 'Imported', json: 'JSON' };
const ROUTE_LABEL: Record<string, string> = { openrouter: 'OpenRouter', reapi: 'reAPI' };

/** 95 → "1:35". */
const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.max(0, Math.floor(seconds % 60))).padStart(2, '0')}`;

/** 95 → "about 2 min", 40 → "under a minute". */
const roughly = (seconds: number): string => (seconds < 60 ? 'under a minute' : `about ${Math.round(seconds / 60)} min`);

/** Seconds since `since`, ticking every second while `active`. */
const useElapsed = (since: string, active: boolean): number => {
  const start = Date.parse(since);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return Math.max(0, Math.round((now - start) / 1000));
};

/** "Usually about 5 min (4 videos) · 2:13 elapsed", or a note that it is running long. */
const waitText = (elapsed: number, eta: UgcEta | undefined): string => {
  if (!eta) return `${clock(elapsed)} elapsed · no timing data yet`;
  const basis = eta.basis === 'same_length' ? `${eta.samples} video${eta.samples === 1 ? '' : 's'}` : 'all lengths';
  if (elapsed > eta.seconds * 1.5 && elapsed - eta.seconds > 60) return `${clock(elapsed)} elapsed · slower than usual (${roughly(eta.seconds)})`;
  return `Usually ${roughly(eta.seconds)} (${basis}) · ${clock(elapsed)} elapsed`;
};

/** Polls the server while the video is generating. The server checks Treg and saves the file to R2. */
const useVideoPolling = (video: UgcVideoDto, onChange: (video: UgcVideoDto) => void) => {
  const client = useLabClient();
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const generating = video.status === 'generating';
  useEffect(() => {
    if (!generating) return;
    let stopped = false;
    const tick = async () => {
      const res = await client.request<{ video?: UgcVideoDto }>(`/ugc-lab/videos/${video.id}`).catch(() => null);
      if (!stopped && res?.ok && res.data.video) onChangeRef.current(res.data.video);
    };
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [client, video.id, generating]);
};

export function VideoCard({ video, eta, onChange, onDelete }: VideoCardProps) {
  const client = useLabClient();
  const [showCaptioned, setShowCaptioned] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [burning, setBurning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  useVideoPolling(video, onChange);
  const elapsed = useElapsed(video.submittedAt, video.status === 'generating');

  const src = video.captionedUrl && showCaptioned ? video.captionedUrl : video.videoUrl;

  async function burnCaptions() {
    setBurning(true);
    setActionError('');
    const res = await client.request<{ video?: UgcVideoDto }>(`/ugc-lab/videos/${video.id}/captions`, { method: 'POST' })
      .catch(() => null);
    setBurning(false);
    if (res?.ok && res.data.video) onChange(res.data.video);
    else setActionError(res ? errorOf(res) : 'Caption burn failed');
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative aspect-[9/16] w-full bg-surface-alt">
        {src ? (
          <video key={src} src={src} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
        ) : video.characterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img src={video.characterUrl} alt="Character" className="h-full w-full object-cover opacity-60" />
        ) : null}
        {video.status === 'generating' && (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-white/90 py-2 text-[12px] text-muted">
            <Spinner /> {waitText(elapsed, eta)}
          </span>
        )}
        {video.status === 'failed' && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/85 px-4 text-center text-[12px] text-red-700">
            {video.error ?? 'Failed'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={video.status} />
          <span className="text-[11px] text-muted tabular-nums">
            {MODE_LABEL[video.mode] ?? video.mode} · {video.durationSec}s · {video.resolution} · {ROUTE_LABEL[video.provider] ?? video.provider} · {usd(video.costUsd ?? video.estimatedCostUsd)}
            {video.status === 'ready' && video.seconds !== null ? ` · made in ${clock(video.seconds)}` : ''}
          </span>
        </div>
        <p className="line-clamp-3 text-[13px] text-ink">{video.script}</p>

        {/* ── Prompt reveal ─────────────────────────────────── */}
        {video.prompt && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setShowPrompt((v) => !v)}
              className="self-start text-[11px] text-muted underline hover:text-ink"
            >
              {showPrompt ? 'Hide prompt' : 'Show prompt'}
            </button>
            {showPrompt && (
              <p className="whitespace-pre-wrap rounded-lg bg-surface-alt px-3 py-2 text-[11px] leading-relaxed text-subtle">
                {video.prompt}
              </p>
            )}
          </div>
        )}

        <p className="text-[11px] text-subtle">{new Date(video.createdAt).toLocaleString()}</p>
        {video.lastPollError && video.status === 'generating' && (
          <p className="text-[11px] text-muted">Last check failed, retrying…</p>
        )}

        {video.captionedUrl && video.videoUrl && (
          <div className="flex gap-2">
            <Pill active={showCaptioned} onClick={() => setShowCaptioned(true)}>Captioned</Pill>
            <Pill active={!showCaptioned} onClick={() => setShowCaptioned(false)}>Raw</Pill>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {video.status === 'ready' && video.videoUrl && (
            <SecondaryButton onClick={() => void burnCaptions()} disabled={burning}>
              {burning ? <><Spinner /> Burning captions…</> : video.captionedUrl ? 'Burn again' : 'Burn captions'}
            </SecondaryButton>
          )}
          {video.downloadUrl && (
            <a href={video.downloadUrl} className="inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt">
              Download
            </a>
          )}
          {confirmDelete ? (
            <>
              <DangerButton onClick={() => onDelete(video.id)}>Delete for good</DangerButton>
              <SecondaryButton onClick={() => setConfirmDelete(false)}>Keep</SecondaryButton>
            </>
          ) : (
            <DangerButton onClick={() => setConfirmDelete(true)}>Delete</DangerButton>
          )}
        </div>
        {actionError && <p className="text-[12px] text-red-700">{actionError}</p>}
      </div>
    </article>
  );
}
