'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ugcRequest, errorOf } from './ugcLab/api';
import {
  EmptyState,
  ErrorLine,
  Notice,
  PrimaryButton,
  SecondaryButton,
  Section,
  Spinner,
  usd,
} from './ugcLab/ui';

// ── Constants ────────────────────────────────────────────────────────────────

const POYO_USD_PER_SECOND = 0.045; // Kling 3.0 Motion Control 720p
const POLL_INTERVAL_MS = 3_000;

const MAX_DURATION_OPTIONS = [5, 10, 15, 20, 30] as const;
type MaxDuration = (typeof MAX_DURATION_OPTIONS)[number];

// ── Types ────────────────────────────────────────────────────────────────────

type UploadState = {
  key: string;
  vendorUrl: string;
  /** Local object URL for previewing the file in the browser */
  previewUrl: string;
  /** Duration in seconds (video only) */
  durationSec?: number;
};

type VoiceState = {
  key: string;
  voiceUrl: string;
  previewUrl: string;
};

type JobStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'failed';

// ── Helpers ─────────────────────────────────────────────────────────────────

const estimateCost = (durationSec: number | undefined): string | null => {
  if (!durationSec || durationSec <= 0) return null;
  return usd(Math.round(POYO_USD_PER_SECOND * durationSec * 100) / 100);
};

const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      resolve(el.duration);
      URL.revokeObjectURL(el.src);
    };
    el.onerror = () => resolve(0);
    el.src = URL.createObjectURL(file);
  });

// ── Sub-components ───────────────────────────────────────────────────────────

type DropZoneProps = {
  title: string;
  subtitle: string;
  accept: string;
  busy: boolean;
  onFile: (file: File) => void;
  children?: React.ReactNode;
};

const DropZone = ({ title, subtitle, accept, busy, onFile, children }: DropZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-line bg-surface-alt p-5 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="text-[12px] text-muted">{subtitle}</p>
      {children ?? (
        /* No file yet — show the primary "Choose file" picker */
        <label
          className={`mx-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 ${busy ? 'pointer-events-none opacity-40' : ''}`}
        >
          {busy ? <><Spinner /> Uploading…</> : 'Choose file'}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={busy}
            onChange={handleChange}
          />
        </label>
      )}
    </div>
  );
};

// ── Result section ───────────────────────────────────────────────────────────

type ResultProps = {
  videoUrl: string;
  onReset: () => void;
};

const ResultSection = ({ videoUrl, onReset }: ResultProps) => (
  <Section title="Clone ready">
    <div className="flex flex-col items-center gap-4">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- generated video, no captions */}
      <video
        src={videoUrl}
        controls
        playsInline
        className="max-h-[600px] w-full max-w-xs rounded-xl ring-1 ring-line"
      />
      <div className="flex flex-wrap gap-3">
        <a
          href={videoUrl}
          download="ugc-clone.mp4"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Download MP4
        </a>
        <SecondaryButton onClick={onReset}>Start new clone</SecondaryButton>
      </div>
    </div>
  </Section>
);

// ── Main tab ─────────────────────────────────────────────────────────────────

type UgcCloneTabProps = { token: string };

export function UgcCloneTab({ token }: UgcCloneTabProps) {
  // Upload states
  const [characterBusy, setCharacterBusy] = useState(false);
  const [characterError, setCharacterError] = useState('');
  const [character, setCharacter] = useState<UploadState | null>(null);

  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [refVideo, setRefVideo] = useState<UploadState | null>(null);

  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voice, setVoice] = useState<VoiceState | null>(null);

  // Max duration cap selected by the user before uploading
  const [maxDurationSec, setMaxDurationSec] = useState<MaxDuration>(30);

  // Generation states
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Refs for intervals so we can clear them on unmount or reset
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed-second ticker — only runs while polling
  useEffect(() => {
    if (jobStatus === 'polling') {
      elapsedRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [jobStatus]);

  // Clear both intervals on unmount (e.g. switching tabs)
  useEffect(() => {
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Upload handlers ────────────────────────────────────────────────────────

  async function uploadCharacter(file: File) {
    setCharacterBusy(true);
    setCharacterError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'character');
    const res = await ugcRequest<{ key?: string; vendorUrl?: string; error?: string }>(
      token, '/api/admin/ugc-lab/clone/upload', { form },
    ).catch(() => null);
    setCharacterBusy(false);
    if (res?.ok && res.data.key && res.data.vendorUrl) {
      const prev = character?.previewUrl;
      if (prev) URL.revokeObjectURL(prev);
      setCharacter({ key: res.data.key, vendorUrl: res.data.vendorUrl, previewUrl: URL.createObjectURL(file) });
    } else {
      setCharacterError(res ? errorOf(res) : 'Upload failed');
    }
  }

  async function uploadVideo(file: File) {
    setVideoBusy(true);
    setVideoError('');
    // Read duration locally before uploading so we can show cost estimate immediately
    const durationSec = await readVideoDuration(file);
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'video');
    const res = await ugcRequest<{ key?: string; vendorUrl?: string; error?: string }>(
      token, '/api/admin/ugc-lab/clone/upload', { form },
    ).catch(() => null);
    setVideoBusy(false);
    if (res?.ok && res.data.key && res.data.vendorUrl) {
      const prev = refVideo?.previewUrl;
      if (prev) URL.revokeObjectURL(prev);
      setRefVideo({ key: res.data.key, vendorUrl: res.data.vendorUrl, previewUrl: URL.createObjectURL(file), durationSec });
    } else {
      setVideoError(res ? errorOf(res) : 'Upload failed');
    }
  }

  async function uploadVoice(file: File) {
    setVoiceBusy(true);
    setVoiceError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'voice');
    const res = await ugcRequest<{ key?: string; voiceUrl?: string; error?: string }>(
      token, '/api/admin/ugc-lab/clone/upload', { form },
    ).catch(() => null);
    setVoiceBusy(false);
    if (res?.ok && res.data.key && res.data.voiceUrl) {
      const prev = voice?.previewUrl;
      if (prev) URL.revokeObjectURL(prev);
      setVoice({ key: res.data.key, voiceUrl: res.data.voiceUrl, previewUrl: URL.createObjectURL(file) });
    } else {
      setVoiceError(res ? errorOf(res) : 'Upload failed');
    }
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  async function generate() {
    if (!character || !refVideo) return;
    setJobStatus('submitting');
    setSubmitError('');
    setProgress(0);
    setElapsedSec(0);
    setResultUrl(null);

    const res = await ugcRequest<{ taskId?: string; error?: string }>(
      token, '/api/admin/ugc-lab/clone/submit', {
        json: { imageVendorUrl: character.vendorUrl, videoVendorUrl: refVideo.vendorUrl },
      },
    ).catch(() => null);

    if (!res?.ok || !res.data.taskId) {
      setSubmitError(res ? errorOf(res) : 'Could not start the job');
      setJobStatus('failed');
      return;
    }

    setTaskId(res.data.taskId);
    setJobStatus('polling');
    pollStatus(res.data.taskId);
  }

  const pollStatus = useCallback((id: string) => {
    // Clear any previous poll (safety guard)
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const res = await ugcRequest<{ status?: string; progress?: number; videoUrl?: string | null; error?: string | null }>(
        token, `/api/admin/ugc-lab/clone/status/${id}`,
      ).catch(() => null);

      if (!res?.ok) {
        // Transient error — keep polling
        return;
      }

      const { status, progress: prog, videoUrl } = res.data;
      setProgress(prog ?? 0);

      if (status === 'finished' && videoUrl) {
        if (pollRef.current) clearInterval(pollRef.current);
        setResultUrl(videoUrl);
        setJobStatus('done');
      } else if (status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        setSubmitError(res.data.error ?? 'Kling returned a failure — try again');
        setJobStatus('failed');
      }
      // not_started / running → keep polling
    }, POLL_INTERVAL_MS);
  }, [token]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    // Stop any in-flight poll
    if (pollRef.current) clearInterval(pollRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (character?.previewUrl) URL.revokeObjectURL(character.previewUrl);
    if (refVideo?.previewUrl) URL.revokeObjectURL(refVideo.previewUrl);
    if (voice?.previewUrl) URL.revokeObjectURL(voice.previewUrl);
    setCharacter(null);
    setRefVideo(null);
    setVoice(null);
    setTaskId(null);
    setJobStatus('idle');
    setProgress(0);
    setElapsedSec(0);
    setSubmitError('');
    setResultUrl(null);
    setCharacterError('');
    setVideoError('');
    setVoiceError('');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // True when the uploaded video exceeds the selected cap
  const videoTooLong = Boolean(refVideo?.durationSec && refVideo.durationSec > maxDurationSec);
  // Cost is based on actual video duration (capped at maxDurationSec for the estimate)
  const effectiveDuration = refVideo?.durationSec
    ? Math.min(refVideo.durationSec, maxDurationSec)
    : undefined;
  const costEstimate = estimateCost(effectiveDuration);
  // Allow retrying immediately after a failure without having to click "Try again" first
  const canGenerate = Boolean(character && refVideo) && !videoTooLong && (jobStatus === 'idle' || jobStatus === 'failed');
  const isGenerating = jobStatus === 'submitting' || jobStatus === 'polling';

  if (jobStatus === 'done' && resultUrl) {
    return (
      <div className="flex flex-col gap-6">
        <ResultSection videoUrl={resultUrl} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Explainer ─────────────────────────────────────────────────────── */}
      <Section
        title="UGC Clone"
        description="Duplicate a viral TikTok video using a new character. Powered by Kling 3.0 Motion Control via Poyo AI · 720p · $0.045/sec"
      >
        <Notice>
          Upload a character image and a reference video. Kling will transfer every gesture, expression,
          and movement from the reference video onto your character — as if the same UGC was filmed by a
          different person.
        </Notice>
      </Section>

      {/* ── Step 1: Character image ────────────────────────────────────────── */}
      <Section title="1 · Character image" description="The face and look of the new performer">
        <DropZone
          title="Character photo"
          subtitle="JPEG, PNG, or WebP · max 12 MB · portrait works best"
          accept="image/jpeg,image/png,image/webp"
          busy={characterBusy}
          onFile={(f) => void uploadCharacter(f)}
        >
          {character ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img
                src={character.previewUrl}
                alt="Character preview"
                className="mx-auto h-48 w-24 rounded-xl object-cover ring-1 ring-line"
              />
              <label
                className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt ${characterBusy ? 'pointer-events-none opacity-40' : ''}`}
              >
                {characterBusy ? <><Spinner /> Uploading…</> : 'Replace'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={characterBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCharacter(f); e.target.value = ''; }}
                />
              </label>
            </div>
          ) : null}
        </DropZone>
        {characterError && <ErrorLine message={characterError} />}
      </Section>

      {/* ── Step 2: Reference video ────────────────────────────────────────── */}
      <Section title="2 · Reference video" description="The TikTok performance to clone">
        {/* Duration cap — choose before uploading so you know upfront if the clip fits */}
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
          Max duration
          <select
            className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink"
            value={maxDurationSec}
            onChange={(e) => setMaxDurationSec(Number(e.target.value) as MaxDuration)}
          >
            {MAX_DURATION_OPTIONS.map((s) => (
              <option key={s} value={s}>{s} sec — est. {usd(Math.round(POYO_USD_PER_SECOND * s * 100) / 100)}</option>
            ))}
          </select>
        </label>

        <DropZone
          title="Reference TikTok / MP4"
          subtitle="MP4 or MOV · max 200 MB · up to 30 s supported"
          accept="video/mp4,video/quicktime"
          busy={videoBusy}
          onFile={(f) => void uploadVideo(f)}
        >
          {refVideo ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- reference video */}
              <video
                src={refVideo.previewUrl}
                controls
                playsInline
                className="mx-auto max-h-64 max-w-xs rounded-xl ring-1 ring-line"
              />
              {refVideo.durationSec && refVideo.durationSec > 0 && (
                <p className="text-[12px] text-muted">
                  Duration: {Math.round(refVideo.durationSec)} s
                  {costEstimate && <> · Estimated cost: <span className="font-medium text-ink">{costEstimate}</span></>}
                </p>
              )}
              <label
                className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt ${videoBusy ? 'pointer-events-none opacity-40' : ''}`}
              >
                {videoBusy ? <><Spinner /> Uploading…</> : 'Replace'}
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="sr-only"
                  disabled={videoBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVideo(f); e.target.value = ''; }}
                />
              </label>
            </div>
          ) : null}
        </DropZone>
        {videoError && <ErrorLine message={videoError} />}
        {videoTooLong && refVideo?.durationSec && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            This clip is {Math.round(refVideo.durationSec)} s — longer than the {maxDurationSec} s cap you selected.
            Upload a shorter clip or increase the max duration above.
          </p>
        )}
      </Section>

      {/* ── Step 3: Voice (optional) ───────────────────────────────────────── */}
      <Section
        title="3 · Voice reference (optional)"
        description="Stored in R2 · not yet wired to Kling generation — reserved for a future audio-swap step"
      >
        <DropZone
          title="Voice sample"
          subtitle="MP3, WAV, M4A, or AAC · max 10 MB"
          accept=".mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac"
          busy={voiceBusy}
          onFile={(f) => void uploadVoice(f)}
        >
          {voice ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user voice sample */}
              <audio controls src={voice.previewUrl} className="w-full max-w-sm" />
              <label
                className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt ${voiceBusy ? 'pointer-events-none opacity-40' : ''}`}
              >
                {voiceBusy ? <><Spinner /> Uploading…</> : 'Replace'}
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac"
                  className="sr-only"
                  disabled={voiceBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVoice(f); e.target.value = ''; }}
                />
              </label>
            </div>
          ) : null}
        </DropZone>
        {voiceError && <ErrorLine message={voiceError} />}
      </Section>

      {/* ── Generate ──────────────────────────────────────────────────────── */}
      <Section
        title="Generate"
        description={
          costEstimate
            ? `Kling 3.0 Motion Control · 720p · estimated ${costEstimate}`
            : 'Kling 3.0 Motion Control · 720p · $0.045/sec of reference video'
        }
      >
        {!character && !refVideo && (
          <EmptyState
            title="Upload a character image and a reference video to get started."
            hint="Steps 1 and 2 above."
          />
        )}

        {(character || refVideo) && (
          <div className="flex flex-col gap-4">
            {/* Summary row */}
            <div className="flex flex-wrap gap-4">
              {character && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={character.previewUrl} alt="" className="h-10 w-5 rounded object-cover" />
                  <span className="text-[12px] text-ink">Character ready</span>
                </div>
              )}
              {refVideo && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
                  <span className="text-[12px] text-muted">Reference</span>
                  <span className="text-[12px] text-ink">
                    {refVideo.durationSec ? `${Math.round(refVideo.durationSec)} s` : 'ready'}
                  </span>
                </div>
              )}
              {voice && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
                  <span className="text-[12px] text-muted">Voice</span>
                  <span className="text-[12px] text-ink">stored</span>
                </div>
              )}
            </div>

            {/* Progress / polling */}
            {isGenerating && (
              <div className="flex items-center gap-3">
                <Spinner />
                <span className="text-[13px] text-muted">
                  {jobStatus === 'submitting'
                    ? 'Submitting to Kling…'
                    : `Generating… ${progress > 0 ? `${progress}%` : ''} (${elapsedSec}s elapsed)`}
                </span>
              </div>
            )}

            {submitError && jobStatus === 'failed' && (
              <div className="flex flex-col gap-2">
                <ErrorLine message={submitError} />
                <SecondaryButton onClick={() => setJobStatus('idle')}>Try again</SecondaryButton>
              </div>
            )}

            {/* CTA */}
            {(jobStatus === 'idle' || jobStatus === 'failed') && (
              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton
                  onClick={() => void generate()}
                  disabled={!canGenerate || isGenerating}
                >
                  {isGenerating
                    ? <><Spinner /> Working…</>
                    : costEstimate
                      ? `Clone · ${costEstimate}`
                      : 'Clone video'}
                </PrimaryButton>
                {!character && <p className="text-[12px] text-red-700">Missing: character image</p>}
                {!refVideo  && <p className="text-[12px] text-red-700">Missing: reference video</p>}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Task ID for debugging */}
      {taskId && jobStatus !== 'idle' && (
        <p className="text-[11px] text-muted">
          Poyo task ID: <code className="font-mono">{taskId}</code>
        </p>
      )}
    </div>
  );
}
