import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { blitzKeys, toAssetDto } from '../../../../../src/server/admin/blitzStore';
import { uploadToR2 } from '../../../../../src/lib/r2';
import { prisma } from '../../../../../src/lib/db';
import { ImageGenerationError, generateVerticalImage } from '../../../../../src/server/ai/imageGeneration';

type GenerateBody = { prompt?: string };

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

  let image;
  try {
    image = await generateVerticalImage(prompt);
  } catch (err) {
    const status = err instanceof ImageGenerationError ? err.status : 502;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Image generation failed' }, { status });
  }
  const { buffer: imageBuffer, contentType, ext } = image;

  // 4. Upload to R2
  const r2Key = blitzKeys.upload('BACKGROUND', ext);
  await uploadToR2(r2Key, imageBuffer, contentType);

  // 5. Create DB asset — name encodes the prompt for future search + [AI] tag
  const name = `${prompt.slice(0, 90)} [AI]`;
  const asset = await prisma.blitzAsset.create({ data: { type: 'BACKGROUND', r2Key, name } });

  return NextResponse.json({ asset: await toAssetDto(asset) }, { status: 201 });
});
