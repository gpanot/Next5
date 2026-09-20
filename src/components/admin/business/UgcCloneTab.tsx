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
import { CloneLibrary } from './ugcClone/CloneLibrary';

// ── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4_000;

const MAX_DURATION_OPTIONS = [5, 10, 15, 20, 30] as const;
type MaxDuration = (typeof MAX_DURATION_OPTIONS)[number];

const DEFAULT_PROMPT =
  'Replace the face in the scene with the face of the character in @image1. ' +
  'Preserve all movements, expressions, timing, and background exactly.';

const DEFAULT_PROMPT_WITH_AUDIO =
  'Replace the face in the scene with the face of the character in @image1. ' +
  'Preserve all movements, expressions, timing, and background exactly. ' +
  'Use the audio as a reference.';

// ── Types ────────────────────────────────────────────────────────────────────

type UploadState = {
  key: string;
  vendorUrl: string;
  previewUrl: string;
  /** Duration in seconds (video only) */
  durationSec?: number;
  /** Vendor URL for the first frame JPEG (video only — for first_frame Seedance role) */
  frameVendorUrl?: string;
};

type VoiceState = {
  key: string;
  voiceUrl: string;        // browser 24-hr URL
  voiceVendorUrl: string;  // vendor 7-day URL (passed to Seedance)
  previewUrl: string;
};

type JobStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'failed';

// ── Helpers ─────────────────────────────────────────────────────────────────

// Video editing mode (duration: -1) — reapi charges based on actual video length.
// Estimate based on the selected duration from the dropdown.
const REAPI_USD_PER_SEC = 0.59 / 5; // ~$0.118/s for doubao-seedance-2.5-face

const estimateCost = (durationSec: number): string =>
  usd(Math.round(REAPI_USD_PER_SEC * durationSec * 100) / 100);

const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => { resolve(el.duration); URL.revokeObjectURL(el.src); };
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

// ── API Preview ──────────────────────────────────────────────────────────────

type ApiPreviewProps = {
  character: UploadState;
  refVideo: UploadState;
  voice: VoiceState | null;
  prompt: string;
  durationSec: number;
};

const ApiPreview = ({ character, refVideo, voice, prompt, durationSec }: ApiPreviewProps) => {
  const hasAudio = Boolean(voice);

  // Exact body that will be sent to reapi (URLs truncated for readability)
  const body: Record<string, unknown> = {
    model:          'doubao-seedance-2.5-face',
    content_filter: false,
    prompt,
    duration:       durationSec,   // explicit from dropdown — never -1
    generate_audio: true,
    image_urls:     [`${character.vendorUrl.slice(0, 55)}…`],
    video_urls:     [`${refVideo.vendorUrl.slice(0, 55)}…`],
  };

  if (hasAudio) {
    body.audio_urls = [`${voice!.voiceVendorUrl.slice(0, 55)}…`];
  }

  return (
    <div className="rounded-xl border border-line bg-zinc-50 p-4 text-left">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        API call preview — verify before clicking Clone
      </p>
      <div className="mb-3 flex flex-wrap gap-3 text-[12px]">
        <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800">
          reapi.video-gen.seedance-2-5.unrestricted
        </span>
        <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-purple-800">
          doubao-seedance-2.5-face
        </span>
        <span className="rounded bg-green-100 px-2 py-0.5 font-mono text-green-800">
          duration: {durationSec}s · ≈ {estimateCost(durationSec)}
        </span>
        {hasAudio && (
          <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-800">
            audio_urls ✓
          </span>
        )}
      </div>
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] leading-5 text-green-300">
        {JSON.stringify(body, null, 2)}
      </pre>
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

  // Duration cap from dropdown
  const [maxDurationSec, setMaxDurationSec] = useState<MaxDuration>(5);
  // Keep file ref to re-upload on cap change
  const refVideoFileRef = useRef<File | null>(null);

  // Editable prompt — auto-updated when voice is added/removed
  const [promptText, setPromptText] = useState(DEFAULT_PROMPT);
  // Track whether user has manually edited the prompt
  const promptEditedRef = useRef(false);

  // Generation states
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Refs for intervals
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed-second ticker — only while polling
  useEffect(() => {
    if (jobStatus === 'polling') {
      elapsedRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [jobStatus]);

  // Cleanup on unmount
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

  async function uploadVideo(file: File, capSec?: MaxDuration) {
    setVideoBusy(true);
    setVideoError('');
    const durationSec = await readVideoDuration(file);
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'video');
    form.append('maxDuration', String(capSec ?? maxDurationSec));
    const res = await ugcRequest<{
      key?: string;
      vendorUrl?: string;
      trimmed?: boolean;
      frameKey?: string;
      frameVendorUrl?: string;
      error?: string;
    }>(token, '/api/admin/ugc-lab/clone/upload', { form }).catch(() => null);
    setVideoBusy(false);
    if (res?.ok && res.data.key && res.data.vendorUrl) {
      const prev = refVideo?.previewUrl;
      if (prev) URL.revokeObjectURL(prev);
      refVideoFileRef.current = file;
      setRefVideo({
        key: res.data.key,
        vendorUrl: res.data.vendorUrl,
        previewUrl: URL.createObjectURL(file),
        durationSec,
        frameVendorUrl: res.data.frameVendorUrl,
      });
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
    const res = await ugcRequest<{
      key?: string;
      voiceUrl?: string;
      voiceVendorUrl?: string;
      error?: string;
    }>(token, '/api/admin/ugc-lab/clone/upload', { form }).catch(() => null);
    setVoiceBusy(false);
    if (res?.ok && res.data.key && res.data.voiceUrl) {
      const prev = voice?.previewUrl;
      if (prev) URL.revokeObjectURL(prev);
      setVoice({
        key: res.data.key,
        voiceUrl: res.data.voiceUrl,
        voiceVendorUrl: res.data.voiceVendorUrl ?? res.data.voiceUrl,
        previewUrl: URL.createObjectURL(file),
      });
      // Auto-switch to audio prompt if user hasn't manually edited it
      if (!promptEditedRef.current) setPromptText(DEFAULT_PROMPT_WITH_AUDIO);
    } else {
      setVoiceError(res ? errorOf(res) : 'Upload failed');
    }
  }

  function removeVoice() {
    if (voice?.previewUrl) URL.revokeObjectURL(voice.previewUrl);
    setVoice(null);
    // Revert to base prompt if not manually edited
    if (!promptEditedRef.current) setPromptText(DEFAULT_PROMPT);
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
        json: {
          imageVendorUrl:  character.vendorUrl,
          videoVendorUrl:  refVideo.vendorUrl,
          voiceVendorUrl:  voice?.voiceVendorUrl,
          prompt:          promptText.trim(),
          characterKey:    character.key,
          refVideoKey:     refVideo.key,
          durationSec:     maxDurationSec,
        },
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
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const res = await ugcRequest<{
        status?: string;
        progress?: number;
        videoUrl?: string | null;
        error?: string | null;
      }>(token, `/api/admin/ugc-lab/clone/status/${id}`).catch(() => null);

      if (!res?.ok) return; // transient — keep polling

      const { status, progress: prog, videoUrl } = res.data;
      setProgress(prog ?? 0);

      if (status === 'finished' && videoUrl) {
        if (pollRef.current) clearInterval(pollRef.current);
        setResultUrl(videoUrl);
        setJobStatus('done');
      } else if (status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        setSubmitError(res.data.error ?? 'Generation failed — try again');
        setJobStatus('failed');
      }
    }, POLL_INTERVAL_MS);
  }, [token]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
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
    promptEditedRef.current = false;
    setPromptText(DEFAULT_PROMPT);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const videoWasTrimmed = Boolean(refVideo?.durationSec && refVideo.durationSec > maxDurationSec);
  const canGenerate =
    Boolean(character && refVideo && promptText.trim()) &&
    (jobStatus === 'idle' || jobStatus === 'failed');
  const isGenerating = jobStatus === 'submitting' || jobStatus === 'polling';
  const showPreview = Boolean(character && refVideo) && !isGenerating && jobStatus !== 'done';

  // ── Result view ────────────────────────────────────────────────────────────

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
        description="Face-swap a TikTok with your character · Seedance 2.5 · reapi · explicit duration"
      >
        <Notice>
          Upload your character image and a reference TikTok video. Seedance replaces the face in the
          reference video with your character. The video is trimmed to the selected duration before
          upload — that determines the output length. Edit the prompt below before generating.
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
      <Section title="2 · Reference video" description="The TikTok scene to clone — first frame used as scene anchor">
        {/* Duration dropdown — choose BEFORE uploading so the server trims on upload */}
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
          Duration
          <select
            className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink"
            value={maxDurationSec}
            onChange={(e) => {
              const next = Number(e.target.value) as MaxDuration;
              setMaxDurationSec(next);
              if (refVideoFileRef.current) void uploadVideo(refVideoFileRef.current, next);
            }}
          >
            {MAX_DURATION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} s — est. {estimateCost(s)}
              </option>
            ))}
          </select>
        </label>

        <DropZone
          title="Reference TikTok / MP4"
          subtitle="MP4 or MOV · max 200 MB · longer clips are trimmed to the selected duration"
          accept="video/mp4,video/quicktime"
          busy={videoBusy}
          onFile={(f) => void uploadVideo(f, maxDurationSec)}
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
              <p className="text-[12px] text-muted">
                {refVideo.durationSec && refVideo.durationSec > 0
                  ? `Original: ${Math.round(refVideo.durationSec)} s · Cloning: ${maxDurationSec} s · Est. ${estimateCost(maxDurationSec)}`
                  : `Cloning: ${maxDurationSec} s · Est. ${estimateCost(maxDurationSec)}`}
                {refVideo.frameVendorUrl && <> · <span className="text-teal-700">first frame captured ✓</span></>}
              </p>
              <label
                className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt ${videoBusy ? 'pointer-events-none opacity-40' : ''}`}
              >
                {videoBusy ? <><Spinner /> Uploading…</> : 'Replace'}
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="sr-only"
                  disabled={videoBusy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVideo(f, maxDurationSec); e.target.value = ''; }}
                />
              </label>
            </div>
          ) : null}
        </DropZone>
        {videoError && <ErrorLine message={videoError} />}
        {videoWasTrimmed && refVideo?.durationSec && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
            Your clip is {Math.round(refVideo.durationSec)} s — trimmed to the first {maxDurationSec} s before upload.
          </p>
        )}
      </Section>

      {/* ── Step 3: Voice (optional) ───────────────────────────────────────── */}
      <Section
        title="3 · Voice reference (optional)"
        description="If provided, added to audio_urls — prompt auto-updates to mention it"
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
              <div className="flex gap-2">
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
                <button
                  type="button"
                  onClick={removeVoice}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-[12px] text-red-600 transition-colors hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
        </DropZone>
        {voiceError && <ErrorLine message={voiceError} />}
      </Section>

      {/* ── Step 4: Prompt ────────────────────────────────────────────────── */}
      <Section
        title="4 · Prompt"
        description="Edit before generating — use @image1 for the character face, @audio1 if voice is uploaded"
      >
        <textarea
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
            promptEditedRef.current = true;
          }}
          rows={5}
          className="w-full rounded-xl border border-line bg-white p-3 text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/20"
          placeholder="Describe what Seedance should do…"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPromptText(voice ? DEFAULT_PROMPT_WITH_AUDIO : DEFAULT_PROMPT);
              promptEditedRef.current = false;
            }}
            className="text-[11px] text-muted underline-offset-2 hover:underline"
          >
            Reset to default
          </button>
        </div>
      </Section>

      {/* ── Generate (with API preview) ────────────────────────────────────── */}
      <Section
        title="Generate"
        description="Seedance 2.5 face · reapi · explicit duration from dropdown"
      >
        {!character && !refVideo && (
          <EmptyState
            title="Upload a character image and a reference video to get started."
            hint="Steps 1 and 2 above."
          />
        )}

        {(character || refVideo) && (
          <div className="flex flex-col gap-4">

            {/* API call preview — shown before submit so user can verify */}
            {showPreview && character && refVideo && (
              <ApiPreview
                character={character}
                refVideo={refVideo}
                voice={voice}
                prompt={promptText}
                durationSec={maxDurationSec}
              />
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="flex items-center gap-3">
                <Spinner />
                <span className="text-[13px] text-muted">
                  {jobStatus === 'submitting'
                    ? 'Submitting to Seedance…'
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
          Task ID: <code className="font-mono">{taskId}</code>
        </p>
      )}

      {/* ── Library ──────────────────────────────────────────────────────── */}
      <CloneLibrary token={token} />
    </div>
  );
}
