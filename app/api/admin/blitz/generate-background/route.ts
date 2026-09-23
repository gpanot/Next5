import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { blitzKeys, toAssetDto } from '../../../../../src/server/admin/blitzStore';
import { uploadToR2 } from '../../../../../src/lib/r2';
import { prisma } from '../../../../../src/lib/db';

type GenerateBody = { prompt?: string };

const REAPI_BASE = 'https://reapi.ai/api/v1';

/** Poll reAPI GET /tasks/{id} until completed or failed (max 5 min). */
async function pollReapiTask(taskId: string, apiKey: string): Promise<{ status: string; output?: { image_urls?: string[] } }> {
  const maxMs = 5 * 60_000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 5_000));
    const res = await fetch(`${REAPI_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await res.json()) as { status: string; output?: { image_urls?: string[] } };
    if (json.status === 'completed' || json.status === 'failed') return json;
  }
  return { status: 'timeout' };
}

/**
 * POST /api/admin/blitz/generate-background
 * Body: { prompt: string }
 *
 * Generates a 9:16 background image via reAPI Nano Banana 2 Lite
 * (Gemini 3.1 Flash-Lite Image — fast, low-cost 1K),
 * uploads the result to R2 as a BACKGROUND asset, and returns the asset DTO.
 *
 * The image is tagged as AI-generated via the name field ("… [AI]") for future
 * filtering and reuse across similar clients.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const apiKey = process.env.REAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'REAPI_API_KEY is not configured on the server.' }, { status: 503 });
  }

  // 1. Submit generation task to reAPI Nano Banana 2 Lite
  type SubmitResult = { id?: string; task_id?: string; status?: string };
  const submitRes = await fetch(`${REAPI_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'nano-banana-2-lite', prompt, aspect_ratio: '9:16' }),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => submitRes.statusText);
    return NextResponse.json({ error: `reAPI submission failed: ${errText.slice(0, 200)}` }, { status: 502 });
  }
  const submission = (await submitRes.json()) as SubmitResult;

  const taskId = submission.id ?? submission.task_id;
  if (!taskId) {
    return NextResponse.json({ error: 'No task_id returned from reAPI' }, { status: 502 });
  }

  // 2. Poll until completed (max 5 min, 5s interval)
  const result = await pollReapiTask(taskId, apiKey);
  if (result.status !== 'completed') {
    return NextResponse.json({ error: `Image generation failed: ${result.status}` }, { status: 502 });
  }

  const imageUrl = result.output?.image_urls?.[0];
  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL in completed task output' }, { status: 502 });
  }

  // 3. Download the generated image
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    return NextResponse.json({ error: `Failed to download generated image: ${imageRes.status}` }, { status: 502 });
  }
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  // Detect format — reAPI returns jpeg or webp
  const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'webp';

  // 4. Upload to R2
  const r2Key = blitzKeys.upload('BACKGROUND', ext);
  await uploadToR2(r2Key, imageBuffer, contentType);

  // 5. Create DB asset — name encodes the prompt for future search + [AI] tag
  const name = `${prompt.slice(0, 90)} [AI]`;
  const asset = await prisma.blitzAsset.create({ data: { type: 'BACKGROUND', r2Key, name } });

  return NextResponse.json({ asset: await toAssetDto(asset) }, { status: 201 });
});
