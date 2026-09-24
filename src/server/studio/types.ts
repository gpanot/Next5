/**
 * Shared types for the Campaign Studio v1 pipeline.
 * All server-only — never import from 'use client' files.
 */

// ─── Field envelope ──────────────────────────────────────────────────────────

/** Every leaf in StudioBrandProfile.data is wrapped in this envelope. */
export type FieldEnvelope<T = string> = {
  value: T;
  /** How the field was obtained: 'crawl' | 'inferred' | 'manual' */
  source: 'crawl' | 'inferred' | 'manual';
  /** 0–1. Human edits always set this to 1. */
  confidence: number;
  evidence?: string[];
  /** True when the admin has locked the value; automation must not overwrite. */
  locked: boolean;
};

// ─── Brand profile data shape ─────────────────────────────────────────────────

export type StudioClassification = {
  vertical: FieldEnvelope;   // e.g. "real_estate"
  subVertical: FieldEnvelope; // e.g. "luxury residential"
  businessModel: FieldEnvelope; // "b2c" | "b2b" | "d2c"
};

export type StudioIdentity = {
  businessName: FieldEnvelope;
  tagline: FieldEnvelope;
  description: FieldEnvelope;
  logoUrl: FieldEnvelope<string | null>;
  primaryColor: FieldEnvelope<string | null>;
};

export type StudioPositioning = {
  /** One-line: what they sell / do. */
  promoting: FieldEnvelope;
  /** One-line: core value proposition. */
  offer: FieldEnvelope;
  /** Differentiator sentence. */
  positioning: FieldEnvelope;
  geography: FieldEnvelope;
};

export type StudioMarket = {
  audienceDescription: FieldEnvelope;
  /** Validated competitors (from Exa search only). */
  competitors: FieldEnvelope<string[]>;
  /** Extracted search keywords for TikTok research. */
  keywords: FieldEnvelope<string[]>;
};

export type StudioTone = {
  tone: FieldEnvelope;        // e.g. "casual_professional"
  hooks: FieldEnvelope<string[]>;
};

/** Shape of StudioBrandProfile.data */
export type StudioProfileData = {
  classification: StudioClassification;
  identity: StudioIdentity;
  positioning: StudioPositioning;
  market: StudioMarket;
  tone: StudioTone;
};

// ─── Telemetry ────────────────────────────────────────────────────────────────

export type StageMetrics = {
  durationMs: number;
  /** Micros of USD (0 if stage made no paid API calls). */
  costUsdMicros: number;
};

export type ExtractTelemetry = {
  stages: {
    crawl: StageMetrics;
    infer: StageMetrics;
    competitors: StageMetrics;
    keywords: StageMetrics;
  };
  totalDurationMs: number;
  totalCostUsdMicros: number;
};

// ─── Variable resolution ──────────────────────────────────────────────────────

/** One resolved variable value, with provenance. */
export type ResolvedVar = {
  value: string;
  source: 'profile' | 'research' | 'fallback';
};

/** Map of template variable keys → resolved values. */
export type VariableMap = Record<string, ResolvedVar>;

// ─── Slideshow payload ────────────────────────────────────────────────────────

export type SlidePayload = {
  text: string;
  /** Resolved background image URL (R2 or CDN). */
  backgroundUrl: string;
  /** True when backgroundUrl is a raster image (not SVG/video). */
  backgroundIsImage: boolean;
  bgPrompt: string;
};

export type SlideshowPayload = {
  slides: SlidePayload[];
  /** Blitz composition id — always 'Slideshow' for v1. */
  compositionId: 'Slideshow';
  /** Total duration in seconds = slideCount × perSlideSeconds. */
  durationSeconds: number;
  /** Per-slide hold time (default: 3). */
  perSlideSeconds: number;
  audioKey?: string;
  textConfig?: Record<string, unknown>;
};

// ─── Guardrails ───────────────────────────────────────────────────────────────

export type GuardrailWarning = {
  type: 'claim' | 'competitor_mention' | 'price_guarantee' | 'profanity';
  text: string;
  rule: string;
};

// ─── Vertical packs ───────────────────────────────────────────────────────────

export type VerticalPack = {
  vertical: string;
  researchKeywords: string[];
  /** Template slug → perspective hint used if LLM is uncertain. */
  defaultPerspectiveHints: Record<string, 'business' | 'audience'>;
};
