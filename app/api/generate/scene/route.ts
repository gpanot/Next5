import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit, waitForTask } from '../../../../src/lib/wavespeed';
import { mirrorToR2, getPresignedUrl, r2IsConfigured } from '../../../../src/lib/r2';
import { getPrompt } from '../../../../src/data/prompts';
import { isMockGeneration } from '../../../../src/lib/mock';
import { photoRoutes } from '../../../../src/data/routes';
import { prisma, isDbConfigured } from '../../../../src/lib/db';

export type SceneRequestBody = {
  /** base64 data URL of the customer's uploaded photo */
  photoDataUrl: string;
  studioId: string;
  feelings: string[];
  bookingId: string;
  /** 1–4 (scenes after the preview shot 0) */
  sceneIndex: number;
};

export type SceneResponseBody = {
  ok: true;
  scene: number;
  url: string;
};

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SceneRequestBody;
    const { photoDataUrl, studioId, feelings, bookingId, sceneIndex } = body;

    if (!photoDataUrl || !studioId || !bookingId || sceneIndex == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sceneIndex < 1 || sceneIndex > 4) {
      return NextResponse.json({ error: 'sceneIndex must be 1–4' }, { status: 400 });
    }

    if (isMockGeneration()) {
      await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 1000));
      const route = photoRoutes.find((r) => r.id === studioId) ?? photoRoutes[0];
      const shotNumber = sceneIndex + 1;
      const url = route.shots[shotNumber - 1]?.src ?? route.shots[0].src;
      return NextResponse.json({ ok: true, scene: shotNumber, url } satisfies SceneResponseBody);
    }

    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const prompt = await getPrompt(studioId, sceneIndex, feelings);

    const imageUrl = await uploadPhotoToWaveSpeed(buffer);
    const taskId = await submitEdit({ imageUrl, prompt, aspectRatio: '3:4', resolution: '1k' });

    const waveSpeedUrl = await waitForTask(taskId, { timeoutMs: 110_000 });

    const shotNumber = sceneIndex + 1;
    const r2Key = `${bookingId}/shot-${String(shotNumber).padStart(2, '0')}.jpg`;
    const finalUrl = await mirrorToR2(waveSpeedUrl, r2Key);
    const isStored = r2IsConfigured() && finalUrl !== waveSpeedUrl;

    let serveUrl = waveSpeedUrl;
    if (isStored) {
      const presigned = await getPresignedUrl(r2Key, 60 * 60 * 24 * 7);
      if (presigned) serveUrl = presigned;
    }

    if (isDbConfigured()) {
      persistScenePhoto({ bookingId, sceneIndex, shotNumber, r2Key, waveSpeedUrl, isStored }).catch(
        (err) => console.error('[scene] DB persist failed:', err),
      );
    }

    return NextResponse.json({ ok: true, scene: shotNumber, url: serveUrl } satisfies SceneResponseBody);
  } catch (err) {
    console.error('[scene] POST error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

type PersistParams = {
  bookingId: string;
  sceneIndex: number;
  shotNumber: number;
  r2Key: string;
  waveSpeedUrl: string;
  isStored: boolean;
};

async function persistScenePhoto(params: PersistParams): Promise<void> {
  const { bookingId, sceneIndex, shotNumber, r2Key, waveSpeedUrl, isStored } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true },
  });

  const userId = booking?.userId ?? null;

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
  }).catch((err) => {
    if (err?.code !== 'P2002')
      console.warn(`[scene] Failed to insert photo record (shot ${shotNumber}):`, err);
  });

  const isLastScene = sceneIndex === 4;
  await prisma.booking
    .update({
      where: { id: bookingId },
      data: { shootStatus: isLastScene ? 'delivered' : 'creating' },
    })
    .catch((err) => console.warn('[scene] Failed to update shootStatus:', err));
}
