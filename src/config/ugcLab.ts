// UGC Lab settings shared by the admin UI and the server routes. No secrets here.

/** Testing runs at 480p only, until generation is reliable. */
export const UGC_RESOLUTION = '480p' as const;

export const UGC_DURATIONS = [8, 16, 24] as const;
export type UgcDuration = (typeof UGC_DURATIONS)[number];

export const isUgcDuration = (value: unknown): value is UgcDuration =>
  typeof value === 'number' && (UGC_DURATIONS as readonly number[]).includes(value);

/** Which Treg route generates the videos. */
export type UgcProvider = 'openrouter' | 'reapi';

/**
 * OpenRouter is ByteDance's official route and the cheapest at 480p; reapi's "less restriction" route
 * costs more and is kept for the videos already made with it (Treg catalog, checked 2026-09-14).
 */
export const UGC_PROVIDERS: Record<UgcProvider, { label: string; shortLabel: string; usdPerSecond: number }> = {
  openrouter: { label: 'Seedance 2.5 via OpenRouter', shortLabel: 'OpenRouter', usdPerSecond: 0.1028 },
  reapi: { label: 'Seedance 2.5 (less restriction) via reAPI', shortLabel: 'reAPI', usdPerSecond: 0.1186 },
};

/**
 * Routes to try, in order. OpenRouter is cheaper ($0.1028/s vs $0.1186/s at 480p) so it goes first,
 * but ByteDance's official route refuses a photo of a real person as the first frame
 * (InputImageSensitiveContentDetected.PrivacyInformation) — and that refusal costs nothing, because
 * it happens before any video is made. So a rejected job falls through to reapi's less-restricted
 * route and the video still gets made.
 */
export const UGC_PROVIDER_ORDER: readonly UgcProvider[] = ['openrouter', 'reapi'];

/** The route a price is quoted from before the job is sent. */
export const UGC_PROVIDER: UgcProvider = UGC_PROVIDER_ORDER[0];

export const isUgcProvider = (value: unknown): value is UgcProvider => value === 'openrouter' || value === 'reapi';

/** Per second of 480p output on the route new videos use. */
export const SEEDANCE_USD_PER_SECOND = UGC_PROVIDERS[UGC_PROVIDER].usdPerSecond;

/** Runs above this ask for a confirm. An 8 s clip ($0.82 to $0.95) goes straight through. */
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
