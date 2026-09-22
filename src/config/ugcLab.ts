// UGC Lab settings shared by the admin UI and the server routes. No secrets here.

/** Default resolution when the user hasn't picked one. */
export const UGC_RESOLUTION = '480p' as const;

/** Resolutions available in the UI for all models. */
export const UGC_RESOLUTIONS = ['480p', '720p'] as const;
export type UgcResolution = (typeof UGC_RESOLUTIONS)[number];
export const isUgcResolution = (v: unknown): v is UgcResolution =>
  (UGC_RESOLUTIONS as readonly string[]).includes(v as string);

export const UGC_DURATIONS = [8, 16, 24] as const;
export type UgcDuration = (typeof UGC_DURATIONS)[number];

export const isUgcDuration = (value: unknown): value is UgcDuration =>
  typeof value === 'number' && (UGC_DURATIONS as readonly number[]).includes(value);

// ── Video model (what the user selects in the UI) ────────────────────────────

/** Top-level model selection shown to the user. */
export type UgcVideoModel = 'seedance' | 'wan3';

export const UGC_VIDEO_MODELS: Record<UgcVideoModel, { label: string; description: string }> = {
  seedance: { label: 'Seedance 2.5', description: 'Lip-sync optimised · ByteDance via Treg' },
  wan3: { label: 'Wan 3.0', description: 'Alibaba multimodal · direct reAPI' },
};

export const isUgcVideoModel = (v: unknown): v is UgcVideoModel => v === 'seedance' || v === 'wan3';

// ── Providers (internal routing layer) ──────────────────────────────────────

/**
 * Routing providers stored in the DB's `provider` column.
 * `wan3` is Alibaba Wan 3.0 submitted directly to reAPI (REAPI_API_KEY), not via Treg.
 */
export type UgcProvider = 'openrouter' | 'reapi' | 'wan3';

/**
 * OpenRouter is ByteDance's official route and the cheapest at 480p; reapi's "less restriction" route
 * costs more and is kept for the videos already made with it (Treg catalog, checked 2026-09-14).
 * wan3 uses the direct reAPI endpoint — usdPerSecond is the 480p rate; 720p costs double.
 */
export const UGC_PROVIDERS: Record<UgcProvider, { label: string; shortLabel: string; usdPerSecond: number }> = {
  openrouter: { label: 'Seedance 2.5 via OpenRouter', shortLabel: 'OpenRouter', usdPerSecond: 0.1028 },
  reapi: { label: 'Seedance 2.5 (less restriction) via reAPI', shortLabel: 'reAPI', usdPerSecond: 0.1186 },
  wan3: { label: 'Wan 3.0 via reAPI (direct)', shortLabel: 'Wan 3.0', usdPerSecond: 0.05 },
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

export const isUgcProvider = (value: unknown): value is UgcProvider =>
  value === 'openrouter' || value === 'reapi' || value === 'wan3';

/** Per second of 480p output on the Seedance route new videos use. */
export const SEEDANCE_USD_PER_SECOND = UGC_PROVIDERS[UGC_PROVIDER].usdPerSecond;

// ── Wan 3.0 resolution-dependent pricing (direct reAPI, per second of output) ─

export const WAN3_USD_PER_SECOND: Record<UgcResolution, number> = {
  '480p': 0.0355,
  '720p': 0.071,
};

/** Runs above this ask for a confirm. An 8 s Seedance clip ($0.82–$0.95) goes straight through. */
export const UGC_CONFIRM_ABOVE_USD = 1;

export const estimateSeedanceUsd = (durationSec: number): number =>
  Math.round(SEEDANCE_USD_PER_SECOND * durationSec * 100) / 100;

/** Estimates the USD cost for the selected model and resolution. */
export const estimateVideoUsd = (
  model: UgcVideoModel,
  resolution: UgcResolution,
  durationSec: number,
): number => {
  if (model === 'wan3') {
    const rate = WAN3_USD_PER_SECOND[resolution] ?? 0.05;
    return Math.round(rate * durationSec * 100) / 100;
  }
  return estimateSeedanceUsd(durationSec);
};

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
