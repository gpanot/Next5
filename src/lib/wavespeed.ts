const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
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
  if (!WAVESPEED_API_KEY) throw new Error('WAVESPEED_API_KEY is not set');

  const formData = new FormData();
  // Convert to Uint8Array first to satisfy strict BlobPart typing
  const blob = new Blob([new Uint8Array(buffer)], { type: `image/${ext}` });
  formData.append('file', blob, `photo.${ext}`);

  const res = await fetch(`${BASE_URL}/media/upload/binary`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
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

export type ImageModel = 'nano-banana-2' | 'gpt-image-2';

/** Fallback model for a manual retry after the default model fails (e.g. its safety filter blocks the photo). */
export const FALLBACK_MODEL: ImageModel = 'gpt-image-2';

export const isImageModel = (value: unknown): value is ImageModel => value === 'nano-banana-2' || value === 'gpt-image-2';

const MODEL_PATHS: Record<ImageModel, string> = {
  'nano-banana-2': 'google/nano-banana-2/edit',
  'gpt-image-2': 'openai/gpt-image-2/edit',
};

const requestBody = (model: ImageModel, images: string[], params: SubmitEditParams): Record<string, unknown> => {
  // gpt-image-2 has no 0.5k tier; its quality defaults to medium (same price as nano-banana-2 at 1k).
  const resolution = model === 'gpt-image-2' && params.resolution === '0.5k' ? '1k' : params.resolution ?? '1k';
  const body = { images, prompt: params.prompt, aspect_ratio: params.aspectRatio ?? '3:4', resolution, output_format: 'jpeg' };
  return model === 'gpt-image-2' ? { ...body, quality: 'medium' } : body;
};

/**
 * Submits an image edit task (Nano Banana 2 by default, GPT Image 2 as the fallback).
 * Returns the WaveSpeed task ID (poll it, or pass `webhookUrl` to be called back).
 */
export async function submitEdit(params: SubmitEditParams & { model?: ImageModel }): Promise<string> {
  if (!WAVESPEED_API_KEY) throw new Error('WAVESPEED_API_KEY is not set');
  const images = params.imageUrls && params.imageUrls.length > 0 ? [...params.imageUrls] : params.imageUrl ? [params.imageUrl] : [];
  if (images.length === 0) throw new Error('submitEdit needs at least one reference image');
  const model = params.model ?? 'nano-banana-2';

  const res = await fetch(`${BASE_URL}/${MODEL_PATHS[model]}${params.webhookUrl ? `?webhook=${encodeURIComponent(params.webhookUrl)}` : ''}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WAVESPEED_API_KEY}`,
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

/** Provider cost per image in micro-USD (1e-6 USD), from WaveSpeed pricing. */
export const COST_USD_MICROS: Record<NonNullable<SubmitEditParams['resolution']>, number> = {
  '0.5k': 45_000,
  '1k': 70_000,
  '2k': 105_000,
  '4k': 140_000,
};

/** GPT Image 2 Edit (medium quality): per resolution, plus $0.012 per reference image. */
const GPT_IMAGE_2_COST_USD_MICROS: Record<NonNullable<SubmitEditParams['resolution']>, number> = {
  '0.5k': 70_000,
  '1k': 70_000,
  '2k': 110_000,
  '4k': 190_000,
};

export const costUsdMicros = (model: ImageModel, resolution: NonNullable<SubmitEditParams['resolution']>, inputImages: number): number =>
  model === 'gpt-image-2' ? GPT_IMAGE_2_COST_USD_MICROS[resolution] + 12_000 * inputImages : COST_USD_MICROS[resolution];

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
  if (!WAVESPEED_API_KEY) throw new Error('WAVESPEED_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/predictions/${taskId}/result`, {
    headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
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
