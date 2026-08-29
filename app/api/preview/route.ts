import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit } from '../../../src/lib/wavespeed';
import { getPrompt } from '../../../src/data/prompts';
import { isMockGeneration } from '../../../src/lib/mock';

export type PreviewRequestBody = {
  /** base64 data URL: "data:image/jpeg;base64,..." */
  photoDataUrl: string;
  studioId: string;
  feelings: string[];
};

export type PreviewResponseBody = {
  taskId: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PreviewRequestBody;
    const { photoDataUrl, studioId, feelings } = body;

    if (!photoDataUrl || !studioId) {
      return NextResponse.json({ error: 'Missing photoDataUrl or studioId' }, { status: 400 });
    }

    if (isMockGeneration()) {
      // Encodes studioId + start time so the stateless poll route below can
      // simulate a believable wait without a database.
      return NextResponse.json({ taskId: `mock-${studioId}-${Date.now()}` } satisfies PreviewResponseBody);
    }

    // 1. Decode base64 → Buffer
    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // 2. Upload to WaveSpeed's own storage (no R2 needed for the temp reference image)
    const imageUrl = await uploadPhotoToWaveSpeed(buffer);

    // 3. Build the prompt for scene 0 (preview shot) — fetched from Airtable, falls back to hardcoded
    const prompt = await getPrompt(studioId, 0, feelings ?? []);

    // 4. Submit generation task — returns a task ID immediately
    const taskId = await submitEdit({ imageUrl, prompt, aspectRatio: '3:4', resolution: '1k' });

    return NextResponse.json({ taskId } satisfies PreviewResponseBody);
  } catch (err) {
    console.error('[preview] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
