'use client';

/**
 * What the UGC Clone editor is made of, apart from its UI: the two Seedance modes, the prompt
 * each one starts from, the duration choices and the cost they imply.
 */

import { usd } from '../ugcLab/ui';

export type CloneMode = 'face-swap' | 'video-update';

export const MAX_DURATION_OPTIONS = [5, 10, 15, 20, 30] as const;
export type CloneDuration = (typeof MAX_DURATION_OPTIONS)[number];

export const CLONE_POLL_INTERVAL_MS = 4_000;

/**
 * Face Swap — doubao-seedance-2.5-face — video editing mode — @Video1 required.
 *   duration: -1 is forced by reapi whenever video_urls is present, so the output length is the
 *   length of the trimmed input video.
 *
 * Video Update — doubao-seedance-2.5 unrestricted — generation mode — no @Video1.
 *   Uses image_with_roles (character + first_frame) and an explicit duration from the dropdown.
 */
export const PROMPTS: Record<CloneMode, { base: string; audio: string }> = {
  'face-swap': {
    base:
      'Keep the entire original video from @Video1, including all animations, background, motion and exact same audio. ' +
      'Swap the face in the video with the face of the AI character from @Image1. ' +
      'Preserve all movements, expressions, timing, and background exactly.',
    audio:
      'Keep the entire original video from @Video1, including all animations, background, motion and exact same audio. ' +
      'Swap the face in the video with the face of the AI character from @Image1. ' +
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
    hint: 'Pixel-precise face replacement. Output length = trimmed input video.',
    billingNote: '⚠️ Uses video editing mode (duration: -1) — Treg billing bug may charge ~$13 flat until they fix it.',
  },
  'video-update': {
    label: 'Video Update',
    model: 'doubao-seedance-2.5',
    hint: 'New generation inspired by the reference scene. Exact duration from dropdown.',
    billingNote: '',
  },
};

/** ~$0.118/s for Seedance 2.5 via reapi. */
const REAPI_USD_PER_SEC = 0.59 / 5;

export const estimateCost = (durationSec: number): string =>
  usd(Math.round(REAPI_USD_PER_SEC * durationSec * 100) / 100);

/** An uploaded file, plus the signed links the editor and the vendor each need. */
export type CloneUpload = {
  key: string;
  /** 7-day vendor URL for the full file. */
  vendorUrl: string;
  /** Local blob URL for the preview. Empty for a video sourced from a URL rather than a file. */
  previewUrl: string;
  /** Video only. */
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
