// Shorts: one workspace's brand (profile + levers + Slideshow Bank) in, a 9:16 narrated video short out.
// Shared by the API routes and the admin pages.

import type { StepCost } from './metaAds';
import type { VisualBible } from './visualBible';

export type ShortVideoModel = 'veo' | 'seedance' | 'omni';

export const SHORT_VIDEO_MODELS: Record<ShortVideoModel, { label: string; detail: string; usdPerSecond: number }> = {
  veo: { label: 'Veo 3.1 Lite', detail: 'Google · treg · 720p, 4/6/8 s clips', usdPerSecond: 0.03 },
  seedance: { label: 'Seedance 2.0 Mini', detail: 'ByteDance · reAPI · 720p, any 4-15 s', usdPerSecond: 0.036 },
  // Billed per clip ($0.347 for 4 s; 360p is priced like 720p, checked 2026-10-08); ~$0.087/s since most beats are 4 s.
  omni: { label: 'Gemini Omni 1.1', detail: 'Google · reAPI · 360p, 4/6/8/10 s clips', usdPerSecond: 0.087 },
};

export const isShortVideoModel = (v: unknown): v is ShortVideoModel => typeof v === 'string' && v in SHORT_VIDEO_MODELS;

/** A model no longer offered (Wan 3.0, dropped 2026-10-06 as too expensive) still shows on old shorts. */
export const videoModelLabel = (m: string): string => SHORT_VIDEO_MODELS[m as ShortVideoModel]?.label ?? m;

/** 1 script (+ fact check) → 2 voice → 3 visuals (prompts + photos) → 4 video clips → 5 render. */
export type ShortStep = 1 | 2 | 3 | 4 | 5;
export const SHORT_STEP_LABELS: Record<ShortStep, string> = { 1: 'Script', 2: 'Voice', 3: 'Photos', 4: 'Video clips', 5: 'Render' };

/**
 * AWAITING_PHOTOS: stopped after the voice so the admin picks the photo model (since 2026-10-10).
 * AWAITING_CLIPS: stopped after the photos (since 2026-10-10) so script and photos are checked before paying for clips.
 */
export type ShortStatus = `STEP_${ShortStep}_RUNNING` | 'AWAITING_PHOTOS' | 'AWAITING_CLIPS' | 'COMPLETED' | 'FAILED';

/** Photo models on reAPI, all at 1K, 9:16. Prices checked on reapi.ai 2026-10-10. */
export type ShortPhotoModel = 'flux-2' | 'nano-banana-2.1' | 'gemini-2.5-flash-image-preview';

export const SHORT_PHOTO_MODELS: Record<ShortPhotoModel, { label: string; detail: string; usdPerPhoto: number }> = {
  'flux-2': { label: 'FLUX.2 Pro', detail: 'Black Forest Labs', usdPerPhoto: 0.028 },
  'nano-banana-2.1': { label: 'Nano Banana 2.1', detail: 'Google · up to 14 references · default', usdPerPhoto: 0.03 },
  'gemini-2.5-flash-image-preview': { label: 'Gemini 2.5 Flash Image', detail: 'Google · cheapest', usdPerPhoto: 0.0144 },
};

/** Nano Banana 2.1 for every generated photo since 2026-10-10 (user's pick). */
export const DEFAULT_PHOTO_MODEL: ShortPhotoModel = 'nano-banana-2.1';

export const isShortPhotoModel = (v: unknown): v is ShortPhotoModel => typeof v === 'string' && v in SHORT_PHOTO_MODELS;

/** Text model of the script, fact check, Visual Bible, storyboard, shot plans, photo check and voice casting, picked per short. */
export type ShortTextModel = 'gpt-6.1-sol' | 'gpt-5.4-mini';

export const SHORT_TEXT_MODELS: Record<ShortTextModel, { label: string; detail: string }> = {
  'gpt-6.1-sol': { label: 'GPT-6.1 Sol', detail: '$2 / $10 per 1M tokens · default' },
  'gpt-5.4-mini': { label: 'GPT-5.4 mini', detail: '$0.75 / $4.50 per 1M tokens · faster' },
};

export const DEFAULT_TEXT_MODEL: ShortTextModel = 'gpt-6.1-sol';

export const isShortTextModel = (v: unknown): v is ShortTextModel => typeof v === 'string' && v in SHORT_TEXT_MODELS;

/** Seconds to ask the video model for: at least the span. Veo makes 4, 6 or 8 s; Gemini Omni 4-10 s; Seedance any 4-15 s. */
export const genSeconds = (model: ShortVideoModel, spanS: number): number => {
  if (model === 'veo') return [4, 6, 8].find((b) => b >= spanS) ?? 8;
  if (model === 'omni') return [4, 6, 8, 10].find((b) => b >= spanS) ?? 10;
  return Math.min(15, Math.max(4, Math.ceil(spanS)));
};

/** What the script was built from: the brand facts and the bank hook. */
export type ShortInputs = {
  brandName: string;
  tone: string;
  audience: string;
  photoStyle: string;
  hookId: string;
  hookText: string;
  meatId: string;
  meatTopic: string;
  /** The reel's essence (reels-af shape), built from the brand: what the script explains. */
  coreClaim: string;
  mechanism: string;
  /** Up to 3 concrete facts quoted from the brand (prices, specs). */
  evidence: string[];
  domain: string;
  /** Every fact the script may use. The fact check verifies claims against it. */
  sourceText: string;
  /** Text model picked when the short was created (absent: the server default). Set before step 1 writes the rest. */
  textModel?: ShortTextModel;
  /** The photo model the admin picked at the photo stop (absent: FLUX.2). */
  photoModel?: ShortPhotoModel;
  /** The brand's Visual Bible as the photo step used it (absent: the classic photo prompts were used). */
  visualBible?: VisualBible;
  /** The anchor photo (main character + hero product) every shot's photo was made from as a reference. */
  anchorKey?: string;
  anchorPrompt?: string;
};

/** One row of the storyboard: what a beat's photo shows. */
export type ShotBoard = { shot: string; setting: string; person: string; product: string };

/** The photo check after generation (vision model), and whether the photo was made again because of it. */
export type ShotQa = { ok: boolean; problem?: string; retried: boolean; firstProblem?: string; fix?: string };

export type ShortScript = {
  hook: string;
  mechanismLines: string[];
  payoffLine: string;
  /** The lesson's body structure (numbered_list, steps, …); absent on scripts written before 2026-10-08. */
  structure?: string;
  /** On-screen call to action for the last scene ("Save this for later"); absent when the close has none. */
  cta?: string;
  /** Spoken text. Scripts before 2026-10-08 may hold inline tags ([curious], [confident]…): removed before speaking. */
  narration: string;
};

export type ClaimVerdict = 'source' | 'web' | 'unsupported';

export type ShortClaim = { claim: string; verdict: ClaimVerdict; evidence: string };

/** One script draft and what the fact check found in it. The last attempt is the script that was used. */
/** Jev's 0..1 ratings of one draft as a YouTube Short script (null when Jev did not answer). Added 2026-10-08. */
export type ShortScriptJev = { overall: number | null; hook: number | null; lesson: number | null };

export type ShortScriptAttempt = { script: ShortScript; claims: ShortClaim[]; jev?: ShortScriptJev };

export type WordTiming = { word: string; startS: number; endS: number };

export type VoiceGender = 'male' | 'female';

/** One of the 6 candidate voices planned for a short (3 male, 3 female, Gemini prebuilt voices). */
export type ShortVoiceOption = {
  name: string;
  gender: VoiceGender;
  /** Google's one-word descriptor ("Friendly", "Firm"). */
  style: string;
  /** Why the planner thinks it fits this brand and script. */
  why: string;
  /** The hook line read by this voice, so it can be compared before a re-run. */
  sampleKey?: string;
  /** Jev's fit score, 0..1; null when Jev was unavailable. */
  jevScore?: number | null;
};

/** Who chose the voice the narration used. */
export type VoicePicker = 'jev' | 'planner' | 'you';

export type ShortAudio = {
  key: string;
  durationS: number;
  voice: string;
  words: WordTiming[];
  sentences: number;
  /** Speed-up applied to every sentence (1 = as read); absent on voices made before 2026-10-08. */
  tempo?: number;
  /** The voice's own pace before the speed-up, spoken words a minute without breaths. */
  rawWpm?: number;
  /** Delivery notes sent with every sentence (Gemini TTS director's notes), written from the brand and script. */
  direction?: string;
  options?: ShortVoiceOption[];
  pickedBy?: VoicePicker;
};

export type ShortVoiceOptionDto = ShortVoiceOption & { sampleUrl: string | null };

export type MotionHint = 'static' | 'slow_zoom_in' | 'slow_zoom_out' | 'pan_left' | 'pan_right' | 'ken_burns';

export type ShortBeat = {
  idx: number;
  role: 'hook' | 'mechanism' | 'payoff';
  text: string;
  startS: number;
  /** How long the beat is on screen: its narration span. */
  spanS: number;
  /** Prompt as the planner wrote it, then as sent to the image model after text/number stripping. */
  rawImagePrompt?: string;
  imagePrompt?: string;
  motionHint?: MotionHint;
  /** What visibly happens during the clip at real-life speed (shot planner, since 2026-10-08). */
  motionAction?: string;
  /** The evidence item the shot grounds on (its subject is shown, never its number). */
  visualAnchor?: string;
  accent?: string | null;
  /** Hook only: top of the text in px on the 1080×1920 frame, chosen by Auto Fit at render (absent: default spot). */
  accentTopY?: number;
  /** Why Auto Fit put the hook there. */
  accentFitReason?: string;
  /** Hook only: the Blitz caption style Gemini picked ('tiktok-red' | 'white-box'); absent on older shorts (Montserrat). */
  accentStyle?: string;
  /** Why that style. */
  accentStyleReason?: string;
  imageKey?: string;
  /** Storyboard row the photo was planned from (Visual Bible shorts). */
  board?: ShotBoard;
  qa?: ShotQa;
  /** Seconds asked from the video model (≥ span; Veo rounds up to 4/6/8). */
  genS?: number;
  clipKey?: string;
  /** Provider task id, and the finished file's URL when the provider gives one (Wan): a re-run downloads it again. */
  clipTaskId?: string;
  clipSourceUrl?: string;
  videoPrompt?: string;
  /** Set when the clip fell back to a slow zoom of the photo. */
  clipError?: string | null;
  clipMs?: number;
};

export type ShortDto = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  /** A ShortVideoModel, or a retired one on old shorts (see videoModelLabel). */
  videoModel: string;
  status: ShortStatus;
  failedStep: ShortStep | null;
  error: string | null;
  hook: string | null;
  durationS: number | null;
  totalUsdMicros: number;
  totalMs: number;
  videoUrl: string | null;
  posterUrl: string | null;
  createdAt: string;
  finishedAt: string | null;
};

/** `imageDownloadUrl`: the photo as a file download (Content-Disposition: attachment). */
export type ShortBeatDto = ShortBeat & { imageUrl: string | null; imageDownloadUrl: string | null; clipUrl: string | null };

export type ShortDetailDto = ShortDto & {
  inputs: ShortInputs | null;
  textModel: ShortTextModel | null;
  anchorUrl: string | null;
  attempts: ShortScriptAttempt[];
  audio: (Omit<ShortAudio, 'key' | 'options'> & { url: string | null; options: ShortVoiceOptionDto[] }) | null;
  beats: ShortBeatDto[];
  stepTimings: Partial<Record<ShortStep, number>>;
  stepCosts: Partial<Record<ShortStep, StepCost>>;
};

export type ShortWorkspaceDto = { id: string; name: string; url: string; brandName: string; hooks: number; shorts: number };
