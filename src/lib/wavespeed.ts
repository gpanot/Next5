import { IMAGE_MODELS, isImageModelId, modelCostUsdMicros, resolutionFor, sizeForRatio, type ImageModelId, type ModelRequestSpec, type ModelResolution } from '../config/imageModels';

/** Read per call so tests and local runs can set it after import. */
const apiKey = (): string | undefined => process.env.WAVESPEED_API_KEY;
const BASE_URL = 'https://api.wavespeed.ai/api/v3';

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Uploads a Buffer to WaveSpeed's own storage via the legacy binary endpoint.
 * Returns the download_url which can be passed directly to model inputs.
 */
export async function uploadPhotoToWaveSpeed(
  buffer: Buffer,
  ext: 'jpg' | 'jpeg' | 'png' = 'jpg',
): Promise<string> {
  const key = apiKey();
  if (!key) throw new Error('WAVESPEED_API_KEY is not set');

  const formData = new FormData();
  // Convert to Uint8Array first to satisfy strict BlobPart typing
  const blob = new Blob([new Uint8Array(buffer)], { type: `image/${ext}` });
  formData.append('file', blob, `photo.${ext}`);

  const res = await fetch(`${BASE_URL}/media/upload/binary`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: formData,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 200) {
    throw new Error(`WaveSpeed upload failed (${res.status}): ${body.message ?? 'unknown'}`);
  }
  return body.data.download_url as string;
}

// ── Generate ──────────────────────────────────────────────────────────────────

export type SubmitEditParams = {
  /** URL of the reference image (user's uploaded photo). Use `imageUrls` for several references. */
  imageUrl?: string;
  /** Ordered reference images (max 14 for nano-banana-2/edit). Takes precedence over `imageUrl`. */
  imageUrls?: readonly string[];
  /** Full prompt string */
  prompt: string;
  /** Portrait by default */
  aspectRatio?: string;
  /** '1k' = $0.07, '2k' = $0.105 */
  resolution?: '0.5k' | '1k' | '2k' | '4k';
  /** Public HTTPS callback; WaveSpeed POSTs the result there when the task finishes. */
  webhookUrl?: string | null;
};

/** Re-exported so callers keep using one name for the model id. */
export type ImageModel = ImageModelId;

/**
 * Model for the one free retry after a photo fails (often a safety filter block).
 * GPT Image photos retry on Nano Banana 2, everything else on GPT Image 2: another provider, another filter.
 */
export const fallbackModelFor = (model: string | null): ImageModelId =>
  model?.startsWith('gpt-image') ? 'nano-banana-2' : 'gpt-image-2';

/** Models only a fallback retry sets explicitly (the default run stores null for Nano Banana 2). */
export const FALLBACK_MODELS: readonly string[] = ['gpt-image-2', 'nano-banana-2'];

export const isImageModel = isImageModelId;

const requestBody = (spec: ModelRequestSpec, images: string[], params: SubmitEditParams): Record<string, unknown> => {
  // Models without a resolution setting keep the input size; 0.5k only exists on nano-banana-2.
  const resolution: ModelResolution = params.resolution === '2k' || params.resolution === '4k' ? '2k' : '1k';
  const ratio = params.aspectRatio ?? '3:4';
  const ratioOk = spec.supportsAspectRatio && (!spec.aspectRatios?.length || spec.aspectRatios.includes(ratio));
  return {
    ...(spec.imagesField === 'image' ? { image: images[0] } : { [spec.imagesField]: images.slice(0, spec.maxImages) }),
    prompt: params.prompt,
    ...(ratioOk ? { aspect_ratio: ratio } : {}),
    ...(spec.supportsResolution ? { resolution: resolutionFor(resolution, spec.resolutions) } : {}),
    ...(spec.supportsSize && !ratioOk ? { size: sizeForRatio(ratio, resolution) } : {}),
    ...(spec.supportsOutputFormat === false ? {} : { output_format: 'jpeg' }),
    ...spec.extraBody,
  };
};

/**
 * Submits an image edit task (Nano Banana 2 by default; see `IMAGE_MODELS` for the rest).
 * Pass `spec` to run a model that is not in our own catalog — the admin bench derives one per WaveSpeed model.
 * Returns the WaveSpeed task ID (poll it, or pass `webhookUrl` to be called back).
 */
export async function submitEdit(params: SubmitEditParams & { model?: ImageModel; spec?: ModelRequestSpec }): Promise<string> {
  const key = apiKey();
  if (!key) throw new Error('WAVESPEED_API_KEY is not set');
  const images = params.imageUrls && params.imageUrls.length > 0 ? [...params.imageUrls] : params.imageUrl ? [params.imageUrl] : [];
  if (images.length === 0) throw new Error('submitEdit needs at least one reference image');
  const spec: ModelRequestSpec = params.spec ?? IMAGE_MODELS[params.model ?? 'nano-banana-2'];

  const res = await fetch(`${BASE_URL}/${spec.path}${params.webhookUrl ? `?webhook=${encodeURIComponent(params.webhookUrl)}` : ''}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody(spec, images, params)),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 200) {
    throw new Error(`WaveSpeed submit failed (${res.status}): ${body.message ?? 'unknown'}`);
  }
  return body.data.id as string;
}

/** Provider cost per image in micro-USD (1e-6 USD), including each model's charge for reference photos. */
export const costUsdMicros = (model: ImageModel, resolution: NonNullable<SubmitEditParams['resolution']>, inputImages: number): number =>
  modelCostUsdMicros(model, resolution === '2k' || resolution === '4k' ? '2k' : '1k', inputImages);

export type SubmitGenerateParams = {
  /** Full text description of the portrait to generate. */
  prompt: string;
  /** Default: '3:4' (portrait). */
  aspectRatio?: string;
  /** '1k' = $0.05, '2k' = $0.075 */
  resolution?: '1k' | '2k';
  /** Public HTTPS callback; WaveSpeed POSTs the result when the task finishes. */
  webhookUrl?: string | null;
};

/**
 * Submits a text-to-image task using Nano Banana 2 (no reference images).
 * Returns the WaveSpeed task ID — poll it or pass `webhookUrl` to be called back.
 */
export async function submitGenerate(params: SubmitGenerateParams): Promise<string> {
  const key = apiKey();
  if (!key) throw new Error('WAVESPEED_API_KEY is not set');
  const path = IMAGE_MODELS['nano-banana-2-t2i'].path;
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio ?? '3:4',
    resolution: params.resolution ?? '1k',
    output_format: 'jpeg',
  };
  const url = `${BASE_URL}/${path}${params.webhookUrl ? `?webhook=${encodeURIComponent(params.webhookUrl)}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 200) {
    throw new Error(`WaveSpeed generate failed (${res.status}): ${data.message ?? 'unknown'}`);
  }
  return data.data.id as string;
}

// ── Poll ──────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'created'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'deleted';

export type PollResult = {
  status: TaskStatus;
  url: string | null;
  error: string | null;
};

const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'failed', 'cancelled', 'timeout', 'deleted'];

export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Single poll — call this from your polling loop or API route. */
export async function pollTask(taskId: string): Promise<PollResult> {
  const key = apiKey();
  if (!key) throw new Error('WAVESPEED_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/predictions/${taskId}/result`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 200) {
    throw new Error(`WaveSpeed poll failed (${res.status}): ${body.message ?? 'unknown'}`);
  }

  const data = body.data;
  return {
    status: data.status as TaskStatus,
    url: (data.outputs?.[0] as string) ?? null,
    error: data.error || null,
  };
}

/**
 * Polls until the task reaches a terminal status.
 * Throws on failure statuses.
 * Returns the output URL on success.
 */
export async function waitForTask(
  taskId: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<string> {
  const { intervalMs = 3000, timeoutMs = 120_000 } = opts;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await pollTask(taskId);

    if (result.status === 'completed') {
      if (!result.url) throw new Error('WaveSpeed returned no output URL');
      return result.url;
    }

    if (isTerminal(result.status)) {
      throw new Error(`WaveSpeed task ${result.status}: ${result.error ?? 'no details'}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`WaveSpeed task timed out after ${timeoutMs}ms`);
}
