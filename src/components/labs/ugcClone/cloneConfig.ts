'use client';

/**
 * What the UGC Clone editor is made of, apart from its UI: the clone modes (Seedance 2.5, Seedance
 * Mini), the prompt each one starts from, the duration choices and the cost they imply.
 */

import { usd } from '../ugcLab/ui';

export type CloneMode = 'face-swap' | 'mini-swap' | 'video-update';

export const CLONE_MODES: CloneMode[] = ['face-swap', 'mini-swap', 'video-update'];

/** Output limits per model (reapi.ai docs, 2026-10-17). Mirrors the submit route. */
export const MIN_DURATION_SEC = 4;
export const MODE_MAX_SEC: Record<CloneMode, number> = { 'face-swap': 30, 'mini-swap': 15, 'video-update': 30 };
/** Uploads keep up to the longest any mode accepts; the duration step picks within that. */
export const UPLOAD_CAP_SEC = 30;
/** Duration when no clip is loaded yet. */
export const DEFAULT_DURATION_SEC = 5;

export const CLONE_POLL_INTERVAL_MS = 4_000;

/**
 * Face Swap — doubao-seedance-2.5-face — @Video1 as a reference, not edit mode. The prompt does
 *   the swap; the duration is the trimmed clip length.
 *
 * Seedance Mini — seedance-2.0-mini on reAPI direct — same prompt, reference image + reference
 *   video, 720p, 4–15 s.
 *
 * Video Update — doubao-seedance-2.5 unrestricted — generation mode — no @Video1.
 *   Uses image_with_roles (character + first_frame) and an explicit duration from the dropdown.
 */
// The user's tested swap prompt (reAPI playground, 2026-10-17).
const SWAP_PROMPTS = {
  base:
    'Keep the entire original video from @Video1, including all animations, background, motion and exact same audio. ' +
    'Swap the face in the video with the face of the AI character from @Image1. ' +
    'Preserve all movements, expressions, timing, and background exactly. ' +
    'Remove any caption in the original video.',
  audio:
    'Keep the entire original video from @Video1, including all animations, background, motion and exact same audio. ' +
    'Swap the face in the video with the face of the AI character from @Image1. ' +
    'Use @Audio1 as the voice of the character. ' +
    'Preserve all movements, expressions, timing, and background exactly. ' +
    'Remove any caption in the original video.',
};

export const PROMPTS: Record<CloneMode, { base: string; audio: string }> = {
  'face-swap': SWAP_PROMPTS,
  'mini-swap': SWAP_PROMPTS,
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
      "Use @Audio1 as the character's voice. " +
      'The result should look like the same UGC video filmed with a different character.',
  },
};

export const getDefaultPrompt = (mode: CloneMode, hasAudio: boolean): string =>
  hasAudio ? PROMPTS[mode].audio : PROMPTS[mode].base;

export const MODE_CONFIG: Record<CloneMode, { label: string; model: string; hint: string; billingNote: string }> = {
  'face-swap': {
    label: 'Face Swap',
    model: 'doubao-seedance-2.5-face',
    hint: 'Seedance 2.5, 480p. Clip as reference, prompt does the swap. Output length = trimmed clip.',
    billingNote: 'reAPI bills any reference video on input + output seconds ($0.072/s each at 480p), so ≈ $0.144 per second of clip.',
  },
  'mini-swap': {
    label: 'Seedance Mini',
    model: 'seedance-2.0-mini',
    hint: 'Seedance 2.0 Mini, 720p. Same swap prompt, about 3× cheaper. Max 15 s.',
    billingNote: 'Billed on input + output seconds, ≈ $0.48 for a 5 s clip. Clips over 15 s are cut to 15 s.',
  },
  'video-update': {
    label: 'Video Update',
    model: 'doubao-seedance-2.5',
    hint: 'New generation inspired by the reference scene. Exact duration from dropdown.',
    billingNote: '',
  },
};

/** Real reAPI rates per second of clip (reapi.ai, checked against settled tasks 2026-10-17). */
const USD_PER_SEC: Record<CloneMode, number> = {
  'face-swap':    0.072 * 2, // 480p "uploaded video" rate on source + output seconds
  'mini-swap':    0.048 * 2, // 720p, same billing (~$0.48 for 5 s, user test 2026-10-17)
  'video-update': 0.119,     // 480p generation
};

export const estimateCost = (mode: CloneMode, durationSec: number): string =>
  usd(Math.round(USD_PER_SEC[mode] * clipSeconds(mode, durationSec) * 100) / 100);

/** What the API accepts for this mode. Mirrors the submit route's clamp. */
export const clipSeconds = (mode: CloneMode, seconds: number): number =>
  Math.min(MODE_MAX_SEC[mode], Math.max(MIN_DURATION_SEC, Math.round(seconds)));

/** Slider top: the whole clip for the swap modes, capped by the model; the model max otherwise. */
export const maxDurationFor = (mode: CloneMode, clipSec?: number): number =>
  mode === 'video-update' || !clipSec
    ? MODE_MAX_SEC[mode]
    : clipSeconds(mode, Math.floor(Math.min(clipSec, UPLOAD_CAP_SEC)));

/** An uploaded file, plus the signed links the editor and the vendor each need. */
export type CloneUpload = {
  key: string;
  /** 7-day vendor URL for the full file. */
  vendorUrl: string;
  /** Local blob URL for the preview. Empty for a video sourced from a URL rather than a file. */
  previewUrl: string;
  /** Video only — length of the stored clip (already cut to UPLOAD_CAP_SEC). */
  durationSec?: number;
  /** Video only — vendor URL for the first-frame JPEG, used by the first_frame role. */
  frameVendorUrl?: string;
};

export type CloneVoice = {
  key: string;
  /** Browser 24-hour URL. */
  voiceUrl: string;
  /** Vendor 7-day URL, passed to Seedance. */
  voiceVendorUrl: string;
  previewUrl: string;
};

export type CloneJobStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'failed';

/** Reads a picked video's length in the browser, so the cost shown is the real one. */
export const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => { resolve(el.duration); URL.revokeObjectURL(el.src); };
    el.onerror = () => resolve(0);
    el.src = URL.createObjectURL(file);
  });
