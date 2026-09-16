// server-only — never import from a 'use client' file.
// Every image-editing model WaveSpeed offers, read from their own model list so the admin bench is never out of date.
// Each entry carries the request shape derived from the model's published schema, plus its price.

import { IMAGE_MODELS, IMAGE_MODEL_IDS, type ModelRequestSpec } from '../../config/imageModels';

export type BenchModel = ModelRequestSpec & {
  id: string;
  label: string;
  /** Vendor the model comes from, e.g. google, openai, bytedance. */
  family: string;
  note: string;
  /** Price per image in micro-USD (1e-6 USD), as WaveSpeed lists it. */
  priceUsdMicros: number;
  /** The model has no aspect ratio and no size, so the photo keeps the shape of the input. */
  keepsInputShape: boolean;
};

const BASE_URL = 'https://api.wavespeed.ai/api/v3';
const CACHE_MS = 30 * 60 * 1000;
const IMAGE_FIELDS = ['images', 'image_urls', 'image'] as const;
/** Models that take a prompt and a photo but do something other than edit it. */
const NOT_AN_EDIT = /(lora|trainer|inpaint|upscal|remov|try-?on|relight|restor|colorize|face-?swap|portrait|watermark|outpaint|layer|material-extract|sam3|image-blend|ic-light|generate-background)/i;

type RawModel = {
  model_id: string;
  base_price: number;
  description?: string;
  type?: string;
  api_schema?: { api_schemas?: { request_schema?: { properties?: Record<string, RawProperty>; required?: string[] } }[] };
};
type RawProperty = { type?: string; maxItems?: number; enum?: string[]; default?: string };

const humanize = (value: string) =>
  value.split(/[-_]/).map((word) => (/^[a-z]/.test(word) ? word[0].toUpperCase() + word.slice(1) : word)).join(' ');

/** "google/nano-banana-2/edit-fast" → "Nano Banana 2 (fast)". */
const labelFor = (modelId: string): string => {
  const [, name = modelId, ...rest] = modelId.split('/');
  const variant = rest.join(' ').replace(/^(image[- ])?edit[- ]?/, '').replace(/^image-to-image$/, '');
  return humanize(name) + (variant ? ` (${humanize(variant).toLowerCase()})` : '');
};

const firstSentence = (text: string | undefined, max = 110): string => {
  const sentence = (text ?? '').split(/(?<=\.)\s/)[0].trim();
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
};

/** Reads a model's published schema and works out how we must call it. Returns null when it is not a prompt-and-photo edit. */
export const toBenchModel = (raw: RawModel): BenchModel | null => {
  if (raw.type !== 'image-to-image' || NOT_AN_EDIT.test(raw.model_id)) return null;
  const schema = raw.api_schema?.api_schemas?.[0]?.request_schema;
  const properties = schema?.properties;
  if (!properties?.prompt) return null;
  const imagesField = IMAGE_FIELDS.find((field) => properties[field]);
  if (!imagesField) return null;
  if ((schema?.required ?? []).includes('mask_image')) return null;

  const images = properties[imagesField];
  const quality = properties.quality?.enum;
  const supportsSize = Boolean(properties.size) && !properties.size.enum;
  return {
    id: raw.model_id,
    label: labelFor(raw.model_id),
    family: raw.model_id.split('/')[0],
    note: firstSentence(raw.description),
    path: raw.model_id,
    imagesField,
    maxImages: images.type === 'array' ? (images.maxItems ?? 10) : 1,
    supportsAspectRatio: Boolean(properties.aspect_ratio),
    supportsResolution: Boolean(properties.resolution),
    supportsSize,
    keepsInputShape: !properties.aspect_ratio && !supportsSize,
    aspectRatios: properties.aspect_ratio?.enum,
    resolutions: properties.resolution?.enum,
    supportsOutputFormat: Boolean(properties.output_format?.enum?.includes('jpeg')),
    // Some models price by quality tier; ask for the middle one so the benchmark is fair.
    extraBody: quality?.includes('medium') ? { quality: 'medium' } : undefined,
    priceUsdMicros: Math.round(raw.base_price * 1_000_000),
  };
};

/** Our own six models, used when WaveSpeed's list cannot be read. */
const staticModels = (): BenchModel[] =>
  IMAGE_MODEL_IDS.map((id) => {
    const model = IMAGE_MODELS[id];
    return {
      ...model,
      id: model.path,
      label: model.label,
      family: model.path.split('/')[0],
      note: model.note,
      priceUsdMicros: model.priceUsdMicros['1k'],
      keepsInputShape: !model.supportsAspectRatio && !model.supportsSize,
    };
  });

let cache: { at: number; models: BenchModel[] } | null = null;

/** Every editing model WaveSpeed offers, cheapest first within each vendor. Cached for half an hour. */
export const listBenchModels = async (): Promise<BenchModel[]> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.models;
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) return staticModels();
  try {
    const res = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } });
    const body = (await res.json()) as { code?: number; data?: RawModel[] };
    if (!res.ok || body.code !== 200 || !Array.isArray(body.data)) throw new Error(`model list failed (${res.status})`);
    const models = body.data.map(toBenchModel).filter((model): model is BenchModel => model !== null);
    if (models.length === 0) throw new Error('model list had no editing models');
    models.sort((a, b) => a.family.localeCompare(b.family) || a.priceUsdMicros - b.priceUsdMicros || a.label.localeCompare(b.label));
    cache = { at: Date.now(), models };
    return models;
  } catch (err) {
    console.error('[model-test] could not read the WaveSpeed model list:', err);
    return staticModels();
  }
};

/** Tests only: forget the cached list so the next call reads it again. */
export const resetBenchModels = (): void => {
  cache = null;
};

export const findBenchModel = async (id: string): Promise<BenchModel | undefined> =>
  (await listBenchModels()).find((model) => model.id === id);
