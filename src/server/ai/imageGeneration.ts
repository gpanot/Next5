// server-only — never import from a 'use client' file.
// 9:16 image generation via reAPI Nano Banana 2 Lite (Gemini Flash-Lite Image: fast, low cost, 1K).
// Used by the Blitz "Generate AI background" button and by the slideshow engines' image fallback.

const REAPI_BASE = 'https://reapi.ai/api/v1';
const POLL_MS = 5_000;
const MAX_WAIT_MS = 5 * 60_000;

export type GeneratedImage = { buffer: Buffer; contentType: string; ext: 'png' | 'jpg' | 'webp' };

export class ImageGenerationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function pollTask(taskId: string, apiKey: string): Promise<{ status: string; output?: { image_urls?: string[] } }> {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const res = await fetch(`${REAPI_BASE}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const json = (await res.json()) as { status: string; output?: { image_urls?: string[] } };
    if (json.status === 'completed' || json.status === 'failed') return json;
  }
  return { status: 'timeout' };
}

/** Generates one vertical image. Throws ImageGenerationError (with an HTTP-ish status) on failure. */
export async function generateVerticalImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.REAPI_API_KEY;
  if (!apiKey) throw new ImageGenerationError('REAPI_API_KEY is not configured on the server.', 503);

  const submitRes = await fetch(`${REAPI_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nano-banana-2-lite', prompt, aspect_ratio: '9:16' }),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => submitRes.statusText);
    throw new ImageGenerationError(`reAPI submission failed: ${errText.slice(0, 200)}`, 502);
  }
  const submission = (await submitRes.json()) as { id?: string; task_id?: string };
  const taskId = submission.id ?? submission.task_id;
  if (!taskId) throw new ImageGenerationError('No task_id returned from reAPI', 502);

  const result = await pollTask(taskId, apiKey);
  if (result.status !== 'completed') throw new ImageGenerationError(`Image generation failed: ${result.status}`, 502);
  const imageUrl = result.output?.image_urls?.[0];
  if (!imageUrl) throw new ImageGenerationError('No image URL in completed task output', 502);

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new ImageGenerationError(`Failed to download generated image: ${imageRes.status}`, 502);
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'webp';
  return { buffer: Buffer.from(await imageRes.arrayBuffer()), contentType, ext };
}
