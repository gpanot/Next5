/**
 * src/server/labs/assetDescriptor/types.ts
 *
 * Shared TypeScript types for the asset descriptor pipeline.
 * Imported by both the Next.js server code and the blitz-worker.
 */

// ── Asset source / kind ───────────────────────────────────────────────────────

export type AssetSource = 'scraped' | 'ai_generated' | 'uploaded';
export type AssetKind   = 'background' | 'meme' | 'ugc_video' | 'music';

// ── Descriptor schemas returned by the model ──────────────────────────────────

export interface VideoDescriptor {
  subject: string;
  action: string;
  setting: string;
  emotion: { face: string; voice: string | null; arc: string };
  vibe: string[];
  meaning: string;
  bestUse: string;
  pairsWithHooks: string[];
  avoidFor: string[];
  timeline: Array<{ start: number; end: number; what: string; peak: boolean }>;
  peakAt: number;
  bestTrim: { start: number; end: number };
  transcript: string | null;
  hasSpeech: boolean;
  originalAudio: { keep: boolean; description: string };
  pacing: string;
  energyLevel: number;
  textSafeZone: string;
  identifiablePerson: boolean;
  publicFigureLikely: boolean;
  rightsRisk: string;
  slotScores: { hook: number; problem: number; proof: number; payoff: number; cta: number };
  nicheScores: { realtor: number; tiktokShop: number };
  retrievalText: string;
}

export interface MusicDescriptor {
  sound: string;
  emotion: string;
  imagery: string;
  meaning: string;
  vibe: string[];
  sections: Array<{ start: number; end: number; label: string; energy: string }>;
  dropAt: number | null;
  bestStart: number;
  fitsStructures: string[];
  pairsWithHooks: string[];
  avoidFor: string[];
  hasVocals: boolean;
  lyricsTheme: string | null;
  pacing: string;
  energyLevel: number;
  bpmEstimate: number | null;
  rightsRisk: string;
  nicheScores: { realtor: number; tiktokShop: number };
  retrievalText: string;
}

export type AnyDescriptor = VideoDescriptor | MusicDescriptor;

// ── Measurements from ffprobe / ffmpeg ────────────────────────────────────────

export interface ProbeResult {
  durationSec: number;
  hasVideo: boolean;
  hasAudio: boolean;
  fileSizeBytes: number;
}

export interface LoudnessResult {
  /** Absolute digit string: "7 6 7 5 5 6 6 6 0" (max per second, -40→0, -5→9) */
  absolute: string;
  /**
   * Relative digit string: same seconds but rescaled so min=0, max=9 across this track.
   * Empty string when max-min < 1 LU (curve is too flat for relative to add value).
   */
  relative: string;
  /** True when the absolute curve has only one distinct digit (omit from prompt). */
  flat: boolean;
  /** Number of M: samples read from ffmpeg stderr. 0 = likely no audio. */
  samplesRead: number;
}

// ── Input to describeAsset() ──────────────────────────────────────────────────

export interface DescribeInput {
  /** Local path to the already-downloaded file */
  filePath: string;
  /** Asset kind — drives which branch and prompt to use */
  kind: AssetKind;
  /** Source provenance — influences rights floor */
  source: AssetSource;
  /** Human-readable name for the prompt */
  name: string;
  /** MIME type: 'video/mp4' | 'audio/mpeg' */
  mimeType: string;
  /** Extension: 'mp4' | 'mp3' */
  ext: string;
}

// ── Output of describeAsset() ─────────────────────────────────────────────────

export interface DescribeResult {
  descriptor: AnyDescriptor;
  durationSec: number;
  cuts: number[];
  loudDigits: string;
  /** Relative loudness digit string (music only; empty for video) */
  loudRelDigits: string;
  loudFlat: boolean;
  rightsSetBy: string;
  repaired: boolean;
  usageTotal: number;
  usageOut: number;
  usageVideo: number;
  usageAudio: number;
  tokPerFrame?: number;
  wallMs: number;
  retries: number;
}

// ── Gemini token usage ────────────────────────────────────────────────────────

export interface UsageSummary {
  text: number;
  image: number;
  audio: number;
  video: number;
  total: number;
  out: number;
}
