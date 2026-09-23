import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { blitzKeys, toAssetDto } from '../../../../../src/server/admin/blitzStore';
import { tregCall, tregPollTask } from '../../../../../src/server/admin/ugcLab';
import { uploadToR2 } from '../../../../../src/lib/r2';
import { prisma } from '../../../../../src/lib/db';

type GenerateBody = { prompt?: string };

/**
 * POST /api/admin/blitz/generate-background
 * Body: { prompt: string }
 *
 * Generates a 9:16 background image via reapi GPT-image-2 (1k resolution ≈ $0.03),
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

  // 1. Submit generation task
  type TaskSubmitResult = { id?: string; task_id?: string; status?: string };
  const submission = await tregCall<TaskSubmitResult>('reapi.image-gen.gpt-image-2', {
    method: 'POST',
    body: { model: 'gpt-image-2', prompt, size: '9:16', resolution: '1k' },
    timeoutMs: 30_000,
  });

  const taskId = submission.id ?? submission.task_id;
  if (!taskId) {
    return NextResponse.json({ error: 'No task_id returned from reapi' }, { status: 502 });
  }

  // 2. Poll until completed (max 5 min, 5s interval — handled by tregPollTask)
  const result = await tregPollTask(taskId);
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

  // Detect format — reapi returns webp or png
  const contentType = imageRes.headers.get('content-type') ?? 'image/webp';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'webp';

  // 4. Upload to R2
  const r2Key = blitzKeys.upload('BACKGROUND', ext);
  await uploadToR2(r2Key, imageBuffer, contentType);

  // 5. Create DB asset — name encodes the prompt for future search + [AI] tag
  const name = `${prompt.slice(0, 90)} [AI]`;
  const asset = await prisma.blitzAsset.create({ data: { type: 'BACKGROUND', r2Key, name } });

  return NextResponse.json({ asset: await toAssetDto(asset) }, { status: 201 });
});
