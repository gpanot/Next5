import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit } from '../../../src/lib/wavespeed';
import { getPrompt } from '../../../src/data/prompts';
import { isMockGeneration } from '../../../src/lib/mock';
import { uploadToR2, r2IsConfigured } from '../../../src/lib/r2';
import { prisma, isDbConfigured, upsertUserByEmail } from '../../../src/lib/db';

export type PreviewRequestBody = {
  /** base64 data URL: "data:image/jpeg;base64,..." */
  photoDataUrl: string;
  studioId: string;
  feelings: string[];
  /** Customer email — collected at the Upload step. Used to create the studio account. */
  email?: string;
  /** Client-generated booking ID (e.g. "GS-1234"). */
  bookingId?: string;
};

export type PreviewResponseBody = {
  taskId: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PreviewRequestBody;
    const { photoDataUrl, studioId, feelings, email, bookingId } = body;

    if (!photoDataUrl || !studioId) {
      return NextResponse.json({ error: 'Missing photoDataUrl or studioId' }, { status: 400 });
    }

    if (isMockGeneration()) {
      return NextResponse.json({ taskId: `mock-${studioId}-${Date.now()}` } satisfies PreviewResponseBody);
    }

    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // Create the user/booking record synchronously BEFORE calling WaveSpeed so
    // the account always exists even if AI generation fails later.
    if (isDbConfigured() && email && bookingId) {
      try {
        await setupBookingRecord(email, bookingId, studioId, buffer, feelings);
      } catch (err) {
        console.error('[preview] DB setup failed (non-fatal):', err);
      }
    }

    const imageUrl = await uploadPhotoToWaveSpeed(buffer);
    const prompt = await getPrompt(studioId, 0, feelings ?? []);
    const taskId = await submitEdit({ imageUrl, prompt, aspectRatio: '3:4', resolution: '1k' });

    if (isDbConfigured() && bookingId) {
      prisma.booking
        .update({ where: { id: bookingId }, data: { wavespeedTaskId: taskId } })
        .then(() => {})
        .catch((err) => console.warn('[preview] Failed to store wavespeedTaskId:', err));
    }

    return NextResponse.json({ taskId } satisfies PreviewResponseBody);
  } catch (err) {
    console.error('[preview] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

async function setupBookingRecord(
  email: string,
  bookingId: string,
  studioId: string,
  photoBuffer: Buffer,
  feelings: string[],
): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Upsert user — this is the canonical "account created" moment
  const before = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const userId = await upsertUserByEmail(email);
  const isNew = !before;

  console.log('[user-created]', {
    email,
    userId,
    bookingId,
    studioId,
    isNew,
    timestamp: new Date().toISOString(),
  });

  // Log duplicate preview attempts (same email, different booking, last 24 h)
  const recentBooking = await prisma.booking.findFirst({
    where: { userId, createdAt: { gte: since }, id: { not: bookingId } },
    select: { id: true, paymentStatus: true },
  });

  if (recentBooking) {
    console.warn('[preview] Duplicate-preview attempt', {
      email,
      newBookingId: bookingId,
      existingBookingId: recentBooking.id,
      existingPaymentStatus: recentBooking.paymentStatus,
    });
  }

  await prisma.booking.upsert({
    where: { id: bookingId },
    update: {},
    create: {
      id: bookingId,
      userId,
      routeId: studioId,
      routeTitle: studioId,
      directorId: '',
      directorName: '',
      feelings,
      goals: [],
      paymentStatus: 'pending',
      shootStatus: 'preview_generating',
    },
  });

  const r2Key = `${bookingId}/customer-upload.jpg`;
  let isStored = false;

  if (r2IsConfigured()) {
    try {
      await uploadToR2(r2Key, photoBuffer, 'image/jpeg');
      isStored = true;
    } catch (err) {
      console.warn('[preview] R2 upload failed for customer photo:', err);
    }
  }

  await prisma.photo.create({
    data: {
      bookingId,
      userId,
      type: 'upload',
      sceneIndex: null,
      r2Key,
      wavespeedUrl: null,
      isStored,
    },
  }).catch((err) => {
    if (err?.code !== 'P2002') console.warn('[preview] Failed to insert upload photo:', err);
  });
}
