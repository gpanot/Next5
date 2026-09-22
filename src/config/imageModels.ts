/**
 * Image models we can generate with on WaveSpeed, with their request shape and price.
 * Prices are per image in micro-USD (1e-6 USD), from each model's API page (checked 2026-09-16).
 * `nano-banana-2` is what customers get; the others are for the admin model test.
 */

export type ImageModelId =
  | 'nano-banana-2'
  | 'nano-banana-pro'
  | 'gpt-image-2'
  | 'seedream-v5-pro'
  | 'flux-2-klein-9b'
  | 'qwen-image'
  | 'nano-banana-2-t2i';

export type ModelResolution = '1k' | '2k';

/** Everything needed to build one model's request body. The admin bench derives this from WaveSpeed's model list. */
export type ModelRequestSpec = {
  /** Path after /api/v3/. */
  path: string;
  /** Field name for the reference images, and whether it takes a list. */
  imagesField: 'images' | 'image' | 'image_urls';
  maxImages: number;
  supportsAspectRatio: boolean;
  supportsResolution: boolean;
  /** Model takes a `size` in pixels (width*height) instead of an aspect ratio. */
  supportsSize?: boolean;
  /** Values the model accepts, when it only takes some. Empty or missing means ours are fine. */
  aspectRatios?: readonly string[];
  resolutions?: readonly string[];
  /** Most models take `output_format`; a few reject anything they did not publish. Defaults to true. */
  supportsOutputFormat?: boolean;
  /** Extra body fields this model needs. */
  extraBody?: Readonly<Record<string, string>>;
};

export type ImageModel = ModelRequestSpec & {
  id: ImageModelId;
  label: string;
  /** Price per image, plus per reference image beyond the first where the model charges for them. */
  priceUsdMicros: Readonly<Record<ModelResolution, number>>;
  perImageUsdMicros?: number;
  note: string;
};

export const IMAGE_MODELS: Record<ImageModelId, ImageModel> = {
  'nano-banana-2': {
    id: 'nano-banana-2',
    label: 'Nano Banana 2',
    path: 'google/nano-banana-2/edit',
    imagesField: 'images',
    maxImages: 14,
    supportsAspectRatio: true,
    supportsResolution: true,
    priceUsdMicros: { '1k': 70_000, '2k': 105_000 },
    note: 'What customers get today.',
  },
  'nano-banana-pro': {
    id: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    path: 'google/nano-banana-pro/edit',
    imagesField: 'images',
    maxImages: 14,
    supportsAspectRatio: true,
    supportsResolution: true,
    priceUsdMicros: { '1k': 140_000, '2k': 140_000 },
    note: 'Sharper, about twice the price and slower.',
  },
  'gpt-image-2': {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    path: 'openai/gpt-image-2/edit',
    imagesField: 'images',
    maxImages: 16,
    supportsAspectRatio: true,
    supportsResolution: true,
    extraBody: { quality: 'medium' },
    priceUsdMicros: { '1k': 70_000, '2k': 110_000 },
    perImageUsdMicros: 12_000,
    note: 'Our fallback when a photo is blocked by the safety filter.',
  },
  'seedream-v5-pro': {
    id: 'seedream-v5-pro',
    label: 'Seedream 5 Pro',
    path: 'bytedance/seedream-v5.0-pro/edit',
    imagesField: 'images',
    maxImages: 10,
    supportsAspectRatio: true,
    supportsResolution: true,
    priceUsdMicros: { '1k': 45_000, '2k': 90_000 },
    perImageUsdMicros: 3_000,
    note: 'Cheapest of the big models, fast.',
  },
  'flux-2-klein-9b': {
    id: 'flux-2-klein-9b',
    label: 'FLUX 2 Klein 9B',
    path: 'wavespeed-ai/flux-2-klein-9b/edit',
    imagesField: 'images',
    maxImages: 10,
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsSize: true,
    priceUsdMicros: { '1k': 16_000, '2k': 16_000 },
    note: 'Very cheap and fast; keeps the input size.',
  },
  'qwen-image': {
    id: 'qwen-image',
    label: 'Qwen Image Edit',
    path: 'wavespeed-ai/qwen-image/edit',
    imagesField: 'image',
    maxImages: 1,
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsSize: true,
    priceUsdMicros: { '1k': 20_000, '2k': 20_000 },
    note: 'Takes one reference photo only.',
  },
  'nano-banana-2-t2i': {
    id: 'nano-banana-2-t2i',
    label: 'Nano Banana 2 (text-to-image)',
    path: 'google/nano-banana-2/text-to-image',
    // Text-to-image: no reference images — imagesField and maxImages are unused but required by the type.
    imagesField: 'images',
    maxImages: 0,
    supportsAspectRatio: true,
    supportsResolution: true,
    priceUsdMicros: { '1k': 50_000, '2k': 75_000 },
    note: 'Portrait generation for new influencers — text-to-image, no reference images.',
  },
};

export const IMAGE_MODEL_IDS = Object.keys(IMAGE_MODELS) as ImageModelId[];

export const isImageModelId = (value: unknown): value is ImageModelId =>
  typeof value === 'string' && value in IMAGE_MODELS;

/**
 * Pixel size for models that take `size` (width*height) instead of an aspect ratio.
 * Keeps the asked ratio and lands on about 1 or 4 megapixels, on a 32 px grid, inside WaveSpeed's 512–4096 range.
 */
export const sizeForRatio = (ratio: string, resolution: ModelResolution): string => {
  const [w, h] = ratio.split(':').map(Number);
  if (!w || !h) return resolution === '2k' ? '2048*2048' : '1024*1024';
  const long = resolution === '2k' ? 2048 : 1024;
  const scale = long / Math.sqrt(w * h);
  const round = (value: number) => Math.min(4096, Math.max(512, Math.round((value * scale) / 32) * 32));
  return `${round(w)}*${round(h)}`;
};

/**
 * The value a model accepts for the resolution we want. Models name sizes differently ('2k', '2K', '1080p'),
 * so we take an exact match first, then anything carrying the same digit, then the model's first choice.
 */
export const resolutionFor = (wanted: ModelResolution, allowed: readonly string[] | undefined): string => {
  if (!allowed || allowed.length === 0) return wanted;
  const digit = wanted[0];
  return allowed.find((value) => value.toLowerCase() === wanted)
    ?? allowed.find((value) => value.includes(digit))
    ?? allowed[0];
};

/** Price for one image from this model, including its charge for extra reference photos. */
export const modelCostUsdMicros = (id: ImageModelId, resolution: ModelResolution, inputImages: number): number => {
  const model = IMAGE_MODELS[id];
  const extras = model.perImageUsdMicros ? model.perImageUsdMicros * Math.min(inputImages, model.maxImages) : 0;
  return model.priceUsdMicros[resolution] + extras;
};
