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
  | 'qwen-image';

export type ModelResolution = '1k' | '2k';

export type ImageModel = {
  id: ImageModelId;
  label: string;
  /** Path after /api/v3/. */
  path: string;
  /** Field name for the reference images, and whether it takes a list. */
  imagesField: 'images' | 'image';
  maxImages: number;
  supportsAspectRatio: boolean;
  supportsResolution: boolean;
  /** Extra body fields this model needs. */
  extraBody?: Readonly<Record<string, string>>;
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
    priceUsdMicros: { '1k': 20_000, '2k': 20_000 },
    note: 'Takes one reference photo only.',
  },
};

export const IMAGE_MODEL_IDS = Object.keys(IMAGE_MODELS) as ImageModelId[];

export const isImageModelId = (value: unknown): value is ImageModelId =>
  typeof value === 'string' && value in IMAGE_MODELS;

/** Price for one image from this model, including its charge for extra reference photos. */
export const modelCostUsdMicros = (id: ImageModelId, resolution: ModelResolution, inputImages: number): number => {
  const model = IMAGE_MODELS[id];
  const extras = model.perImageUsdMicros ? model.perImageUsdMicros * Math.min(inputImages, model.maxImages) : 0;
  return model.priceUsdMicros[resolution] + extras;
};
