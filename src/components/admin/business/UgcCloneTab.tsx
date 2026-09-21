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

type Mode = 'face-swap' | 'video-update';

// ─── 4 prompts ───────────────────────────────────────────────────────────────
//
// Face Swap  — doubao-seedance-2.5-face — video editing mode — @Video1 required
//   duration: -1 forced by reapi when video_urls is present
//   output length = trimmed input video length
//
// Video Update — doubao-seedance-2.5 unrestricted — generation mode — NO @Video1
//   uses image_with_roles (character + first_frame), explicit duration from dropdown
//
const PROMPTS: Record<Mode, { base: string; audio: string }> = {
  'face-swap': {
    base:
      'Keep the entire original video from @Video1, including all animations, background, motion and audio. ' +
      'Only replace the face in the video with the face of the character from @Image1. ' +
      'Preserve all movements, expressions, timing, and background exactly.',
    audio:
      'Keep the entire original video from @Video1, including all animations, background, motion and audio. ' +
      'Only replace the face in the video with the face of the character from @Image1. ' +
      'Use @Audio1 as the voice of the character. ' +
      'Preserve all movements, expressions, timing, and background exactly.',
  },
  'video-update': {
    base:
      'Generate a video of the character from @Image1 performing the exact same scene as in the reference. ' +
      'Mirror the body movements, gestures, facial expressions, camera framing, and timing. ' +
      'Keep the same background, lighting, and all surrounding visual elements. ' +
      'The result should look like the same UGC video filmed with a different character.',
    audio:
      'Generate a video of the character from @Image1 performing the exact same scene as in the reference. ' +
      'Mirror the body movements, gestures, facial expressions, camera framing, and timing. ' +
      'Keep the same background, lighting, and all surrounding visual elements. ' +
      'Use @Audio1 as the character\'s voice. ' +
      'The result should look like the same UGC video filmed with a different character.',
  },
};

const getDefaultPrompt = (mode: Mode, hasAudio: boolean) =>
  hasAudio ? PROMPTS[mode].audio : PROMPTS[mode].base;

// ── Types ────────────────────────────────────────────────────────────────────

type UploadState = {
  key: string;
  vendorUrl: string;     // 7-day vendor URL for the full video
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

const REAPI_USD_PER_SEC = 0.59 / 5; // ~$0.118/s for Seedance 2.5

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

// ── Mode Toggle ──────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<Mode, {
  label: string;
  model: string;
  hint: string;
  billingNote: string;
}> = {
  'face-swap': {
    label:       'Face Swap',
    model:       'doubao-seedance-2.5-face',
    hint:        'Pixel-precise face replacement. Output length = trimmed input video.',
    billingNote: '⚠️ Uses video editing mode (duration: -1) — Treg billing bug may charge ~$13 flat until they fix it.',
  },
  'video-update': {
    label:       'Video Update',
    model:       'doubao-seedance-2.5',
    hint:        'New generation inspired by the reference scene. Exact duration from dropdown.',
    billingNote: '',
  },
};

// ── API Preview ──────────────────────────────────────────────────────────────

type ApiPreviewProps = {
  mode: Mode;
  character: UploadState;
  refVideo: UploadState;
  voice: VoiceState | null;
  prompt: string;
  durationSec: number;
};

const ApiPreview = ({ mode, character, refVideo, voice, prompt, durationSec }: ApiPreviewProps) => {
  const hasAudio = Boolean(voice);
  const cfg = MODE_CONFIG[mode];

  const body: Record<string, unknown> = {
    model:          cfg.model,
    content_filter: false,
    prompt,
    resolution:     '480p',
    generate_audio: true,
  };

  if (mode === 'face-swap') {
    // Video editing mode — video_urls triggers duration: -1
    body.duration = -1;
    body.image_with_roles = [
      { url: `${character.vendorUrl.slice(0, 55)}…`, role: 'reference_image' },
    ];
    body.video_urls = [`${refVideo.vendorUrl.slice(0, 55)}…`];
  } else {
    // Generation mode — first_frame + explicit duration
    body.duration = durationSec;
    body.size = 'adaptive';
    body.image_with_roles = [
      { url: `${character.vendorUrl.slice(0, 55)}…`, role: 'reference_image' },
      { url: `${(refVideo.frameVendorUrl ?? '').slice(0, 55)}…`, role: 'first_frame' },
    ];
  }

  if (hasAudio) {
    body.audio_urls = [`${voice!.voiceVendorUrl.slice(0, 55)}…`];
  }

  return (
    <div className="rounded-xl border border-line bg-zinc-50 p-4 text-left">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        API call preview — verify before clicking Clone
      </p>
      <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
        <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800">
          reapi.video-gen.seedance-2-5.unrestricted
        </span>
        <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-purple-800">
          {cfg.model}
        </span>
        {mode === 'face-swap' ? (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-800">
            duration: -1 (video editing)
          </span>
        ) : (
          <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
            duration: {durationSec}s · ≈ {estimateCost(durationSec)}
          </span>
        )}
        {mode === 'face-swap' && (
          <span className="rounded bg-teal-100 px-2 py-0.5 text-teal-800">video_urls ✓</span>
        )}
        {mode === 'video-update' && refVideo.frameVendorUrl && (
          <span className="rounded bg-teal-100 px-2 py-0.5 text-teal-800">first_frame ✓</span>
        )}
        {hasAudio && (
          <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-800">audio_urls ✓</span>
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
  // Mode
  const [mode, setMode] = useState<Mode>('face-swap');

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

  // Editable prompt — auto-updated when mode/voice changes (unless user edited it)
  const [promptText, setPromptText] = useState(PROMPTS['face-swap'].base);
  const promptEditedRef = useRef(false);

  // Sync prompt when mode changes (if not manually edited)
  useEffect(() => {
    if (!promptEditedRef.current) {
      setPromptText(getDefaultPrompt(mode, Boolean(voice)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
      if (!promptEditedRef.current) setPromptText(getDefaultPrompt(mode, true));
    } else {
      setVoiceError(res ? errorOf(res) : 'Upload failed');
    }
  }

  function removeVoice() {
    if (voice?.previewUrl) URL.revokeObjectURL(voice.previewUrl);
    setVoice(null);
    if (!promptEditedRef.current) setPromptText(getDefaultPrompt(mode, false));
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
          mode,
          imageVendorUrl:  character.vendorUrl,
          videoVendorUrl:  refVideo.vendorUrl,       // face-swap: passed as video_urls
          frameVendorUrl:  refVideo.frameVendorUrl,  // video-update: first_frame role
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

      if (!res?.ok) return;

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
    setPromptText(getDefaultPrompt(mode, false));
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const videoWasTrimmed = Boolean(refVideo?.durationSec && refVideo.durationSec > maxDurationSec);
  const canGenerate =
    Boolean(character && refVideo && promptText.trim()) &&
    (jobStatus === 'idle' || jobStatus === 'failed');
  const isGenerating = jobStatus === 'submitting' || jobStatus === 'polling';
  const showPreview = Boolean(character && refVideo) && !isGenerating && jobStatus !== 'done';
  const cfg = MODE_CONFIG[mode];

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

      {/* ── Step 0: Mode toggle ────────────────────────────────────────────── */}
      <Section
        title="UGC Clone"
        description="Pick a mode, then follow the steps below"
      >
        <div className="grid grid-cols-2 gap-3">
          {(['face-swap', 'video-update'] as Mode[]).map((m) => {
            const c = MODE_CONFIG[m];
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors ${
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-ink hover:bg-surface-alt'
                }`}
              >
                <span className="text-[14px] font-semibold">{c.label}</span>
                <span className={`font-mono text-[10px] ${active ? 'text-white/60' : 'text-muted'}`}>
                  {c.model}
                </span>
                <span className={`text-[11px] leading-snug ${active ? 'text-white/80' : 'text-muted'}`}>
                  {c.hint}
                </span>
              </button>
            );
          })}
        </div>
        {cfg.billingNote && (
          <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
            {cfg.billingNote}
          </p>
        )}
      </Section>

      {/* ── Step 1: Duration ──────────────────────────────────────────────── */}
      <Section
        title="1 · Duration"
        description={
          mode === 'face-swap'
            ? 'Reference video is trimmed to this length — output matches the trimmed input'
            : 'How many seconds to generate — sent explicitly to the API'
        }
      >
        <div className="grid grid-cols-5 gap-2">
          {MAX_DURATION_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setMaxDurationSec(s);
                if (refVideoFileRef.current) void uploadVideo(refVideoFileRef.current, s);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border py-3 text-[13px] font-medium transition-colors ${
                maxDurationSec === s
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-white text-ink hover:bg-surface-alt'
              }`}
            >
              <span className="text-[15px] font-semibold">{s}s</span>
              <span className={`text-[11px] ${maxDurationSec === s ? 'text-white/70' : 'text-muted'}`}>
                ≈ {estimateCost(s)}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Step 2: Character image ────────────────────────────────────────── */}
      <Section title="2 · Character image" description="The face and look of the new performer">
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

      {/* ── Step 3: Reference video ────────────────────────────────────────── */}
      <Section title="3 · Reference video" description="The TikTok to clone — trimmed to the selected duration on upload">
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
                {refVideo.frameVendorUrl && <> · <span className="text-teal-700">first frame ✓</span></>}
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

      {/* ── Step 4: Voice (optional) ───────────────────────────────────────── */}
      <Section
        title="4 · Voice reference (optional)"
        description="If provided, added to audio_urls — prompt auto-updates to mention @Audio1"
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

      {/* ── Step 5: Prompt ────────────────────────────────────────────────── */}
      <Section
        title="5 · Prompt"
        description={
          mode === 'face-swap'
            ? 'Uses @Image1 (character) and @Video1 (reference) — editing mode, duration: -1'
            : 'Uses @Image1 (character) only — generation mode, explicit duration'
        }
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
              setPromptText(getDefaultPrompt(mode, Boolean(voice)));
              promptEditedRef.current = false;
            }}
            className="text-[11px] text-muted underline-offset-2 hover:underline"
          >
            Reset to default
          </button>
          {/* Quick-switch prompts */}
          {voice && (
            <>
              <span className="text-[11px] text-muted">·</span>
              <button type="button" onClick={() => { setPromptText(PROMPTS[mode].base); promptEditedRef.current = true; }} className="text-[11px] text-muted underline-offset-2 hover:underline">Without audio</button>
              <span className="text-[11px] text-muted">·</span>
              <button type="button" onClick={() => { setPromptText(PROMPTS[mode].audio); promptEditedRef.current = true; }} className="text-[11px] text-muted underline-offset-2 hover:underline">With audio</button>
            </>
          )}
        </div>
      </Section>

      {/* ── Generate (with API preview) ────────────────────────────────────── */}
      <Section
        title="Generate"
        description={`${cfg.label} · ${cfg.model} · reapi`}
      >
        {!character && !refVideo && (
          <EmptyState
            title="Upload a character image and a reference video to get started."
            hint="Steps 2 and 3 above."
          />
        )}

        {(character || refVideo) && (
          <div className="flex flex-col gap-4">

            {/* API call preview */}
            {showPreview && character && refVideo && (
              <ApiPreview
                mode={mode}
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
                    : `${cfg.label}`}
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
