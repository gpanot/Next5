// Shorts: one workspace's brand (profile + levers + Slideshow Bank) in, a 9:16 narrated video short out.
// Shared by the API routes and the admin pages.

import type { StepCost } from './metaAds';

export type ShortVideoModel = 'veo' | 'seedance';

export const SHORT_VIDEO_MODELS: Record<ShortVideoModel, { label: string; detail: string; usdPerSecond: number }> = {
  veo: { label: 'Veo 3.1 Lite', detail: 'Google · treg · 720p, 4/6/8 s clips', usdPerSecond: 0.03 },
  seedance: { label: 'Seedance 2.0 Mini', detail: 'ByteDance · reAPI · 720p, any 4-15 s', usdPerSecond: 0.036 },
};

export const isShortVideoModel = (v: unknown): v is ShortVideoModel => v === 'veo' || v === 'seedance';

/** A model no longer offered (Wan 3.0, dropped 2026-10-06 as too expensive) still shows on old shorts. */
export const videoModelLabel = (m: string): string => SHORT_VIDEO_MODELS[m as ShortVideoModel]?.label ?? m;

/** 1 script (+ fact check) → 2 voice → 3 visuals (prompts + photos) → 4 video clips → 5 render. */
export type ShortStep = 1 | 2 | 3 | 4 | 5;
export const SHORT_STEP_LABELS: Record<ShortStep, string> = { 1: 'Script', 2: 'Voice', 3: 'Photos', 4: 'Video clips', 5: 'Render' };

export type ShortStatus = `STEP_${ShortStep}_RUNNING` | 'COMPLETED' | 'FAILED';

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
};

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
export type ShortScriptAttempt = { script: ShortScript; claims: ShortClaim[] };

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
  /** The evidence item the shot grounds on (its subject is shown, never its number). */
  visualAnchor?: string;
  accent?: string | null;
  imageKey?: string;
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

export type ShortBeatDto = ShortBeat & { imageUrl: string | null; clipUrl: string | null };

export type ShortDetailDto = ShortDto & {
  inputs: ShortInputs | null;
  attempts: ShortScriptAttempt[];
  audio: (Omit<ShortAudio, 'key' | 'options'> & { url: string | null; options: ShortVoiceOptionDto[] }) | null;
  beats: ShortBeatDto[];
  stepTimings: Partial<Record<ShortStep, number>>;
  stepCosts: Partial<Record<ShortStep, StepCost>>;
};

export type ShortWorkspaceDto = { id: string; name: string; url: string; brandName: string; hooks: number; shorts: number };
