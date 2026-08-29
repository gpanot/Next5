/**
 * Legacy batch-generation endpoint — kept for backwards compatibility.
 * The primary path is POST /api/generate/scene (one scene at a time).
 */
import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit, waitForTask } from '../../../src/lib/wavespeed';
import { mirrorToR2, getPresignedUrl, r2IsConfigured } from '../../../src/lib/r2';
import { getPrompt } from '../../../src/data/prompts';
import { prisma, isDbConfigured } from '../../../src/lib/db';

export type GenerateRequestBody = {
  /** base64 data URL of the customer's uploaded photo */
  photoDataUrl: string;
  studioId: string;
  studioTitle: string;
  feelings: string[];
  bookingId: string;
};

type GenerateResult = {
  scene: number;
  url: string;
  stored: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequestBody;
    const { photoDataUrl, studioId, feelings, bookingId } = body;

    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const imageUrl = await uploadPhotoToWaveSpeed(buffer);

    if (isDbConfigured()) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { shootStatus: 'creating' },
      });
    }

    const booking = isDbConfigured()
      ? await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } })
      : null;
    const userId = booking?.userId ?? null;

    const results: GenerateResult[] = [];

    for (let sceneIndex = 1; sceneIndex <= 4; sceneIndex++) {
      const prompt = await getPrompt(studioId, sceneIndex, feelings);

      const taskId = await submitEdit({ imageUrl, prompt, aspectRatio: '3:4', resolution: '1k' });
      const waveSpeedUrl = await waitForTask(taskId, { timeoutMs: 90_000 });

      const shotNumber = sceneIndex + 1;
      const r2Key = `${bookingId}/shot-${String(shotNumber).padStart(2, '0')}.jpg`;
      const finalUrl = await mirrorToR2(waveSpeedUrl, r2Key);
      const isStored = r2IsConfigured() && finalUrl !== waveSpeedUrl;

      let serveUrl = waveSpeedUrl;
      if (isStored) {
        const presigned = await getPresignedUrl(r2Key, 60 * 60 * 24 * 7);
        if (presigned) serveUrl = presigned;
      }

      results.push({ scene: shotNumber, url: serveUrl, stored: isStored });

      if (isDbConfigured()) {
        await prisma.photo.create({
          data: {
            bookingId,
            userId,
            type: 'generated',
            sceneIndex,
            r2Key,
            wavespeedUrl: waveSpeedUrl,
            isStored,
          },
        });
      }
    }

    if (isDbConfigured()) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { shootStatus: 'delivered' },
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[generate] POST error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
