// UGC Lab settings shared by the admin UI and the server routes. No secrets here.

/** Testing runs at 480p only, until generation is reliable. */
export const UGC_RESOLUTION = '480p' as const;

export const UGC_DURATIONS = [8, 16, 24] as const;
export type UgcDuration = (typeof UGC_DURATIONS)[number];

export const isUgcDuration = (value: unknown): value is UgcDuration =>
  typeof value === 'number' && (UGC_DURATIONS as readonly number[]).includes(value);

/** reapi.video-gen.seedance-2-5.unrestricted at 480p, per second of output (Treg catalog, checked 2026-09-14). */
export const SEEDANCE_USD_PER_SECOND = 0.1186;

/** Runs above this ask for a confirm. An 8 s clip ($0.95) goes straight through. */
export const UGC_CONFIRM_ABOVE_USD = 1;

export const estimateSeedanceUsd = (durationSec: number): number =>
  Math.round(SEEDANCE_USD_PER_SECOND * durationSec * 100) / 100;

/** A video still generating after this is given up on, and any timing this long is not real waiting time. */
export const UGC_VIDEO_TIMEOUT_SEC = 25 * 60;

/** Natural speaking pace is about 2.3 words per second; above 2.5 Seedance rushes or cuts the speech. */
export const UGC_TARGET_WORDS: Record<UgcDuration, number> = { 8: 18, 16: 36, 24: 54 };
export const UGC_MAX_WORDS: Record<UgcDuration, number> = { 8: 20, 16: 40, 24: 60 };

export const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** Seconds a script takes to say at a natural pace. */
export const speakingSeconds = (text: string): number => Math.round((countWords(text) / 2.3) * 10) / 10;

/** How much of the person the photo shows — decides how the camera moves. */
export type UgcShot = 'close' | 'medium' | 'wide';

/** What the uploaded photo shows, so the video keeps the same place and moment. */
export type UgcScene = {
  person: string;
  setting: string;
  action: string;
  shot: UgcShot;
};

/**
 * first_frame: the video starts on the uploaded photo and keeps its place (photo flow).
 * reference: the image only guides the person's look; Seedance invents the scene (AI character flow).
 */
export type UgcImageMode = 'first_frame' | 'reference';
