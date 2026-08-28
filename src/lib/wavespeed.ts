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
  /** URL of the reference image (user's uploaded photo) */
  imageUrl: string;
  /** Full prompt string */
  prompt: string;
  /** Portrait by default */
  aspectRatio?: string;
  /** '1k' = $0.07, '2k' = $0.105 */
  resolution?: '0.5k' | '1k' | '2k' | '4k';
};

/**
 * Submits a Nano Banana 2 Edit task.
 * Returns the WaveSpeed task ID for polling.
 */
export async function submitEdit(params: SubmitEditParams): Promise<string> {
  if (!WAVESPEED_API_KEY) throw new Error('WAVESPEED_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/google/nano-banana-2/edit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: [params.imageUrl],
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio ?? '3:4',
      resolution: params.resolution ?? '1k',
      output_format: 'jpeg',
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 200) {
    throw new Error(`WaveSpeed submit failed (${res.status}): ${body.message ?? 'unknown'}`);
  }
  return body.data.id as string;
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
