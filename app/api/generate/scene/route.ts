import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit, waitForTask } from '../../../../src/lib/wavespeed';
import { mirrorToR2, getPresignedUrl, r2IsConfigured, getObjectBuffer } from '../../../../src/lib/r2';
import { getPrompt } from '../../../../src/data/prompts';
import { isMockGeneration } from '../../../../src/lib/mock';
import { photoRoutes } from '../../../../src/data/routes';
import { prisma, isDbConfigured } from '../../../../src/lib/db';

export type SceneRequestBody = {
  /**
   * base64 data URL of the customer's uploaded photo.
   * Optional when generating from the studio page — the server will read the
   * photo from R2 using `bookingId/customer-upload.jpg` instead.
   */
  photoDataUrl?: string;
  studioId: string;
  feelings: string[];
  bookingId: string;
  /** 0–4 */
  sceneIndex: number;
  /**
   * When true the API returns immediately after submitting the WaveSpeed job.
   * The actual R2 mirror + DB write runs in the background via after().
   * The client should poll /api/studio/me to detect when the photo is ready.
   */
  background?: boolean;
};

export type SceneResponseBody = {
  ok: true;
  scene: number;
  url: string | null;
  /** Present and true when the generation is running server-side; poll /api/studio/me for the result. */
  background?: boolean;
};

// 150 s: main handler (~10 s) + after() background work (~120 s WaveSpeed + R2 + DB)
export const maxDuration = 150;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SceneRequestBody;
    const { photoDataUrl, studioId, feelings, bookingId, sceneIndex, background = false } = body;

    if (!studioId || !bookingId || sceneIndex == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sceneIndex < 0 || sceneIndex > 4) {
      return NextResponse.json({ error: 'sceneIndex must be 0–4' }, { status: 400 });
    }

    if (isMockGeneration()) {
      await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 1000));
      const route = photoRoutes.find((r) => r.id === studioId) ?? photoRoutes[0];
      const shotNumber = sceneIndex + 1;
      const url = route.shots[shotNumber - 1]?.src ?? route.shots[0].src;
      return NextResponse.json({ ok: true, scene: shotNumber, url } satisfies SceneResponseBody);
    }

    // Resolve the photo buffer — either from the request body or from R2 storage.
    let buffer: Buffer;
    if (photoDataUrl) {
      const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64, 'base64');
    } else {
      const uploadPhoto = isDbConfigured()
        ? await prisma.photo.findFirst({
            where: { bookingId, type: 'upload', isStored: true, r2Key: { not: null } },
            select: { r2Key: true },
          })
        : null;
      const customerKey = uploadPhoto?.r2Key ?? `${bookingId}/customer-upload.jpg`;
      const downloaded = await getObjectBuffer(customerKey);
      if (!downloaded) {
        return NextResponse.json(
          { error: 'Customer photo not found in storage — upload flow may not have completed.' },
          { status: 404 },
        );
      }
      buffer = downloaded;
    }

    const shotNumber = sceneIndex + 1;
    const r2Key = `${bookingId}/shot-${String(shotNumber).padStart(2, '0')}.jpg`;
    const prompt = await getPrompt(studioId, sceneIndex, feelings);
    const imageUrl = await uploadPhotoToWaveSpeed(buffer);
    const taskId = await submitEdit({ imageUrl, prompt, aspectRatio: '3:4', resolution: '1k' });

    if (background) {
      // Return immediately — the rest runs in the background via after().
      // Client should poll /api/studio/me to detect when the photo appears.
      after(async () => {
        try {
          console.log(`[scene/bg] bookingId=${bookingId} sceneIndex=${sceneIndex} taskId=${taskId} — waiting for WaveSpeed`);
          const waveSpeedUrl = await waitForTask(taskId, { timeoutMs: 120_000 });
          const finalUrl = await mirrorToR2(waveSpeedUrl, r2Key);
          const isStored = r2IsConfigured() && finalUrl !== waveSpeedUrl;
          if (isDbConfigured()) {
            await persistScenePhoto({ bookingId, sceneIndex, shotNumber, r2Key, waveSpeedUrl, isStored });
          }
          console.log(`[scene/bg] bookingId=${bookingId} sceneIndex=${sceneIndex} — done`);
        } catch (err) {
          console.error(`[scene/bg] bookingId=${bookingId} sceneIndex=${sceneIndex} — error:`, err);
        }
      });
      return NextResponse.json({ ok: true, scene: shotNumber, url: null, background: true } satisfies SceneResponseBody);
    }

    // Synchronous path (normal auto-generation on mount)
    const waveSpeedUrl = await waitForTask(taskId, { timeoutMs: 110_000 });
    const finalUrl = await mirrorToR2(waveSpeedUrl, r2Key);
    const isStored = r2IsConfigured() && finalUrl !== waveSpeedUrl;

    let serveUrl = waveSpeedUrl;
    if (isStored) {
      const presigned = await getPresignedUrl(r2Key, 60 * 60 * 24 * 7);
      if (presigned) serveUrl = presigned;
    }

    if (isDbConfigured()) {
      // Use after() so the DB write completes even if the client disconnects right now
      after(() => persistScenePhoto({ bookingId, sceneIndex, shotNumber, r2Key, waveSpeedUrl, isStored })
        .catch((err) => console.error('[scene] DB persist failed:', err)));
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
