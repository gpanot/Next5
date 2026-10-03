/**
 * Shared types for the Campaign Studio v1 pipeline.
 * All server-only — never import from 'use client' files.
 */

import type { ProductPhoto } from '../../lib/manualProfile';
import type { SlideshowStyle } from '../../types/admin/companyIntel';

// ─── Field envelope ──────────────────────────────────────────────────────────

/** Every leaf in StudioBrandProfile.data is wrapped in this envelope. */
export type FieldEnvelope<T = string> = {
  value: T;
  /** How the field was obtained: 'crawl' | 'inferred' | 'manual' */
  source: 'crawl' | 'inferred' | 'manual';
  /** 0–1. Human edits always set this to 1. */
  confidence: number;
  evidence?: string[];
  /** For derived fields: signature of the inputs the value was computed from (stale when it changes). */
  derivedFrom?: string;
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
  /** How customers buy or reach the business. Manual profiles only (no website to read it from). */
  howToBuy?: FieldEnvelope;
};

export type StudioMarket = {
  audienceDescription: FieldEnvelope;
  /**
   * IDC niches — the specific industries this business sells TO (B2B only).
   * e.g. ["auto mechanics", "electricians"] for a booking-software vendor.
   * Used to seed TikTok research with customer-relevant content instead of vendor-vertical content.
   */
  targetCustomerIndustries: FieldEnvelope<string[]>;
  /** Validated competitors (from Exa search only). */
  competitors: FieldEnvelope<string[]>;
  /** Extracted search keywords for TikTok research. */
  keywords: FieldEnvelope<string[]>;
  /**
   * Proof printed on the site (testimonials, metrics, client counts), each with its verbatim quote.
   * Used by the slideshow engine's Proof shot. Absent on profiles extracted before it existed.
   */
  proofPoints?: FieldEnvelope<Array<{ claim: string; evidence: string }>>;
};

export type StudioTone = {
  tone: FieldEnvelope;        // e.g. "casual_professional"
  hooks: FieldEnvelope<string[]>;
};

/** The site's look, read from its HTML/CSS and the profile call. Used by Auto Slideshow's photos and slide boxes. */
export type StudioVisual = {
  /** Hex colors from the site's CSS, brand colors first. */
  palette: FieldEnvelope<string[]>;
  faviconUrl: FieldEnvelope<string | null>;
  /** The site's share image (og:image). */
  heroImageUrl: FieldEnvelope<string | null>;
  /** Null when the model gave no usable photo direction: slideshows then use the default look. */
  slideshowStyle: FieldEnvelope<SlideshowStyle | null>;
};

/**
 * The brand in Auto Slideshow's words, from its own prompt and model (companyIntel/profile.ts summarizeBrand): one plain
 * sentence naming the brand and what it sells, and the buyer. Richer than `promoting` / `audienceDescription`, which
 * are capped short for Blitz's research.
 */
export type StudioBrand = {
  valueProp: FieldEnvelope;
  audience: FieldEnvelope;
  tone: FieldEnvelope;
  productCategories: FieldEnvelope<string[]>;
};

/** Shape of StudioBrandProfile.data */
export type StudioProfileData = {
  classification: StudioClassification;
  identity: StudioIdentity;
  positioning: StudioPositioning;
  market: StudioMarket;
  tone: StudioTone;
  /** Product photos with vision descriptions. Manual profiles only (src/lib/manualProfile.ts). */
  products?: FieldEnvelope<ProductPhoto[]>;
  /** Absent on profiles extracted before 2026-10-02. */
  visual?: StudioVisual;
  /** Absent on profiles extracted before 2026-10-02, or when the brand call failed. */
  brand?: StudioBrand;
  /**
   * The crawled text (menu + homepage + key pages). Later steps check quotes against it (levers, CTAs).
   * Absent on profiles extracted before 2026-10-02 and on hand-typed profiles.
   */
  siteText?: string;
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
