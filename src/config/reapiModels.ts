/**
 * Image models we run on reAPI (https://reapi.ai/docs). Client-safe: ids, labels and request shape only.
 * The ids are what we store in `batch_items.model`, so pump and poll route the item to reAPI.
 * Prices are estimates per image in micro-USD, for our cost tracking only (checked 2026-09-27).
 */

export type ReapiModelId =
  | 'reapi-nano-banana-2-lite'
  | 'reapi-gpt-image-2.5'
  | 'reapi-gpt-image-2-low'
  | 'reapi-grok-imagine'
  | 'reapi-grok-imagine-2-official'
  | 'reapi-nano-banana-2'
  | 'reapi-flux-2'
  | 'reapi-nano-banana-2.1'
  | 'gemini-3-pro-image'
  | 'reapi-fallback-gpt-image-2.5'
  | 'reapi-fallback-nano-banana-2';

/**
 * How the model takes its output size:
 * - `aspect_ratio`: `aspect_ratio: "9:16"`, 1K only.
 * - `aspect_resolution`: `aspect_ratio: "9:16"` plus `resolution: "1K" | "2K"`.
 * - `ratio`: `size: "9:16"` plus `resolution: "1K" | "2K"`.
 * - `pixels`: `size: "WIDTHxHEIGHT"`.
 */
export type ReapiSizing = 'aspect_ratio' | 'aspect_resolution' | 'ratio' | 'pixels';

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
  extraBody?: Readonly<Record<string, string | number>>;
  /** Field for the reference images. Default `image_urls`. */
  imagesField?: 'image_urls' | 'input_urls';
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
  'reapi-grok-imagine': {
    id: 'reapi-grok-imagine',
    // xAI Grok Imagine: Auto Slideshow backgrounds. No 4:5 ratio (1:1, 3:4, 2:3, 9:16…), so we ask 3:4 and crop.
    apiModel: 'grok-imagine',
    label: 'Grok Imagine',
    note: 'Cheap, bright photos. Backgrounds under text.',
    maxImages: 1,
    sizing: 'aspect_ratio',
    supports2k: false,
    // $0.005 flat: "high" bills 5 credits, "standard" 10 (checked on real calls 2026-09-29). 2k costs the same as 1k
    // and returns 1776x2368, so we always ask 2k.
    priceUsdMicros: { '1k': 5_000, '2k': 5_000 },
    extraBody: { quality: 'high', resolution: '2k' },
  },
  'reapi-grok-imagine-2-official': {
    id: 'reapi-grok-imagine-2-official',
    // xAI Grok Imagine Image 2.0, official channel: Auto Slideshow backgrounds since 2026-09-30. The non-official
    // "grok-imagine-image-2-0" failed too many generations. 3:4 at "1k" comes back 864x1152 in about 30 s; "2k" gives
    // 1776x2368 for 25 credits (tested 2026-09-30).
    apiModel: 'grok-imagine-image-2.0-official',
    label: 'Grok Imagine 2 (official)',
    note: 'Bright, clean photos. Backgrounds under text.',
    maxImages: 1,
    sizing: 'aspect_ratio',
    supports2k: false,
    // 17 credits a photo at 1k, low quality = $0.017 (real call 2026-09-30).
    priceUsdMicros: { '1k': 17_000, '2k': 17_000 },
    extraBody: { resolution: '1k', quality: 'low', n: 1 },
  },
  'reapi-nano-banana-2': { id: 'reapi-nano-banana-2', ...NANO_BANANA_2 },
  'reapi-flux-2': {
    id: 'reapi-flux-2',
    // Black Forest Labs FLUX.2 (Pro tier): Blitz deck images and "Generate AI background" since 2026-10-09.
    apiModel: 'flux-2',
    label: 'FLUX.2',
    note: 'Natural, photographic scenes.',
    maxImages: 8,
    sizing: 'aspect_resolution',
    supports2k: true,
    imagesField: 'input_urls',
    // $0.028 at 1K, $0.039 at 2K. Checked 2026-10-09, reapi.ai/models/flux-2.
    priceUsdMicros: { '1k': 28_000, '2k': 39_000 },
  },
  'reapi-nano-banana-2.1': {
    id: 'reapi-nano-banana-2.1',
    // Google Nano Banana 2.1: every generated photo since 2026-10-10 (slideshows, Blitz, Shorts). Keeps a person and a
    // product the same across reference images.
    apiModel: 'nano-banana-2.1',
    label: 'Nano Banana 2.1',
    note: 'Keeps people and products the same.',
    maxImages: 14,
    sizing: 'aspect_ratio',
    supports2k: false,
    // $0.03 at 1K. Checked 2026-10-10, reapi.ai. reAPI wants lowercase "1k" here.
    priceUsdMicros: { '1k': 30_000, '2k': 30_000 },
    extraBody: { resolution: '1k' },
  },
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
