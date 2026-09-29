/**
 * Image models we run on reAPI (https://reapi.ai/docs). Client-safe: ids, labels and request shape only.
 * The ids are what we store in `batch_items.model`, so pump and poll route the item to reAPI.
 * Prices are estimates per image in micro-USD, for our cost tracking only (checked 2026-09-27).
 */

export type ReapiModelId =
  | 'reapi-nano-banana-2-lite'
  | 'reapi-gpt-image-2.5'
  | 'reapi-gpt-image-2-low'
  | 'reapi-nano-banana-2'
  | 'gemini-3-pro-image'
  | 'reapi-fallback-gpt-image-2.5'
  | 'reapi-fallback-nano-banana-2';

/**
 * How the model takes its output size:
 * - `aspect_ratio`: `aspect_ratio: "9:16"`, 1K only.
 * - `ratio`: `size: "9:16"` plus `resolution: "1K" | "2K"`.
 * - `pixels`: `size: "WIDTHxHEIGHT"`.
 */
export type ReapiSizing = 'aspect_ratio' | 'ratio' | 'pixels';

export type ReapiModel = {
  id: ReapiModelId;
  /** The `model` value reAPI expects. */
  apiModel: string;
  label: string;
  note: string;
  maxImages: number;
  sizing: ReapiSizing;
  supports2k: boolean;
  priceUsdMicros: Readonly<Record<'1k' | '2k', number>>;
  extraBody?: Readonly<Record<string, string>>;
};

const GPT_IMAGE_2_5: Omit<ReapiModel, 'id'> = {
  apiModel: 'gpt-image-2.5-flare',
  label: 'ChatGPT Image 2.5',
  note: 'Best at keeping your product exact.',
  maxImages: 16,
  sizing: 'pixels',
  supports2k: true,
  // reAPI Standard channel, flat per image. Checked 2026-09-28, reapi.ai/models/gpt-image-2-5.
  priceUsdMicros: { '1k': 23_000, '2k': 23_000 },
  extraBody: { quality: 'medium', output_format: 'jpeg' },
};

const NANO_BANANA_2: Omit<ReapiModel, 'id'> = {
  apiModel: 'gemini-3.1-flash-image-preview',
  label: 'Nano Banana 2',
  note: 'Fast, good all-rounder.',
  maxImages: 14,
  sizing: 'ratio',
  supports2k: true,
  priceUsdMicros: { '1k': 50_000, '2k': 75_000 },
};

export const REAPI_MODELS: Record<ReapiModelId, ReapiModel> = {
  'reapi-nano-banana-2-lite': {
    id: 'reapi-nano-banana-2-lite',
    apiModel: 'nano-banana-2-lite',
    label: 'Nano Banana 2 Lite',
    note: 'Fastest and cheapest. 1K only.',
    maxImages: 10,
    sizing: 'aspect_ratio',
    supports2k: false,
    // $0.015 flat. Checked 2026-09-28, reapi.ai/models/nano-banana-2-lite.
    priceUsdMicros: { '1k': 15_000, '2k': 15_000 },
  },
  'reapi-gpt-image-2.5': { id: 'reapi-gpt-image-2.5', ...GPT_IMAGE_2_5 },
  'reapi-gpt-image-2-low': {
    id: 'reapi-gpt-image-2-low',
    // Stable (official) channel, low quality: mood backgrounds under text, where detail matters less than price.
    apiModel: 'gpt-image-2-official',
    label: 'GPT Image 2 (low)',
    note: 'Cheapest. Backgrounds under text.',
    maxImages: 16,
    sizing: 'ratio',
    supports2k: false,
    // $0.005 flat at 1K, low quality. Given by the team 2026-09-29.
    priceUsdMicros: { '1k': 5_000, '2k': 5_000 },
    // reAPI wants lowercase "1k" here; it overrides the ratio sizing's "1K".
    extraBody: { resolution: '1k', quality: 'low', background: 'auto', moderation: 'auto' },
  },
  'reapi-nano-banana-2': { id: 'reapi-nano-banana-2', ...NANO_BANANA_2 },
  'gemini-3-pro-image': {
    id: 'gemini-3-pro-image',
    apiModel: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image',
    note: 'Sharpest detail, slowest.',
    maxImages: 14,
    sizing: 'ratio',
    supports2k: true,
    // reAPI Default channel ("gemini-3-pro-image-preview"): $0.030 at 1K and 2K. The Official Google channel
    // ("…-official") is $0.108 — not the one we call. Checked 2026-09-28, reapi.ai/models/gemini-3-pro-image-preview.
    priceUsdMicros: { '1k': 30_000, '2k': 30_000 },
  },
  // Same models, used only for the one free retry of a failed photo (so it is not retried again).
  'reapi-fallback-gpt-image-2.5': { id: 'reapi-fallback-gpt-image-2.5', ...GPT_IMAGE_2_5 },
  'reapi-fallback-nano-banana-2': { id: 'reapi-fallback-nano-banana-2', ...NANO_BANANA_2 },
};

export const REAPI_MODEL_IDS = Object.keys(REAPI_MODELS) as ReapiModelId[];

/** The models a seller can pick under "Advanced" when creating Shop photos. */
export const SHOP_PICKABLE_MODELS: readonly ReapiModelId[] = ['reapi-nano-banana-2-lite', 'reapi-gpt-image-2.5', 'reapi-nano-banana-2', 'gemini-3-pro-image'];

export const isReapiModelId = (value: unknown): value is ReapiModelId =>
  typeof value === 'string' && value in REAPI_MODELS;

export const isShopPickableModel = (value: unknown): value is ReapiModelId =>
  typeof value === 'string' && (SHOP_PICKABLE_MODELS as readonly string[]).includes(value);

/** Fallback-only ids: a photo that failed on one of these gets no further free retry. */
export const REAPI_FALLBACK_MODELS: readonly string[] = ['reapi-fallback-gpt-image-2.5', 'reapi-fallback-nano-banana-2'];

/** A failed reAPI photo retries on another reAPI model: GPT Image moves to Nano Banana 2, the rest to GPT Image. */
export const reapiFallbackFor = (id: ReapiModelId): ReapiModelId =>
  REAPI_MODELS[id].apiModel.startsWith('gpt-image') ? 'reapi-fallback-nano-banana-2' : 'reapi-fallback-gpt-image-2.5';

/**
 * Pixel size for GPT Image 2.5 (`WIDTHxHEIGHT`): long edge 1536 (1K) or 2048 (2K), both edges on a 16 px grid.
 * Stays inside reAPI's rules (ratio 1:3–3:1, 655,360–8,294,400 pixels).
 */
export const reapiPixelSize = (ratio: string, highRes: boolean): string => {
  const [w, h] = ratio.split(':').map(Number);
  const long = highRes ? 2048 : 1536;
  if (!w || !h || w === h) return highRes ? '2048x2048' : '1024x1024';
  const short = Math.round((long * Math.min(w, h)) / Math.max(w, h) / 16) * 16;
  return w > h ? `${long}x${short}` : `${short}x${long}`;
};
