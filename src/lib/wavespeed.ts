import { IMAGE_MODELS, isImageModelId, modelCostUsdMicros, type ImageModelId, type ModelResolution } from '../config/imageModels';

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

/** Fallback model for a manual retry after the default model fails (e.g. its safety filter blocks the photo). */
export const FALLBACK_MODEL: ImageModelId = 'gpt-image-2';

export const isImageModel = isImageModelId;

const requestBody = (model: ImageModel, images: string[], params: SubmitEditParams): Record<string, unknown> => {
  const spec = IMAGE_MODELS[model];
  // Models without a resolution setting keep the input size; 0.5k only exists on nano-banana-2.
  const resolution: ModelResolution = params.resolution === '2k' || params.resolution === '4k' ? '2k' : '1k';
  return {
    ...(spec.imagesField === 'image' ? { image: images[0] } : { images: images.slice(0, spec.maxImages) }),
    prompt: params.prompt,
    ...(spec.supportsAspectRatio ? { aspect_ratio: params.aspectRatio ?? '3:4' } : {}),
    ...(spec.supportsResolution ? { resolution } : {}),
    output_format: 'jpeg',
    ...spec.extraBody,
  };
};

/**
 * Submits an image edit task (Nano Banana 2 by default; see `IMAGE_MODELS` for the rest).
 * Returns the WaveSpeed task ID (poll it, or pass `webhookUrl` to be called back).
 */
export async function submitEdit(params: SubmitEditParams & { model?: ImageModel }): Promise<string> {
  const key = apiKey();
  if (!key) throw new Error('WAVESPEED_API_KEY is not set');
  const images = params.imageUrls && params.imageUrls.length > 0 ? [...params.imageUrls] : params.imageUrl ? [params.imageUrl] : [];
  if (images.length === 0) throw new Error('submitEdit needs at least one reference image');
  const model: ImageModel = params.model ?? 'nano-banana-2';

  const res = await fetch(`${BASE_URL}/${IMAGE_MODELS[model].path}${params.webhookUrl ? `?webhook=${encodeURIComponent(params.webhookUrl)}` : ''}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody(model, images, params)),
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
