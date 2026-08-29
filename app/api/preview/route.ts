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
  const t0 = Date.now();
  try {
    const body = (await req.json()) as PreviewRequestBody;
    const { photoDataUrl, studioId, feelings, email, bookingId } = body;

    console.log('[preview] POST received', {
      studioId,
      email: email ?? '(none)',
      bookingId: bookingId ?? '(none)',
      feelings,
      photoBytes: Math.round((photoDataUrl?.length ?? 0) * 0.75),
      dbConfigured: isDbConfigured(),
      mock: isMockGeneration(),
    });

    if (!photoDataUrl || !studioId) {
      return NextResponse.json({ error: 'Missing photoDataUrl or studioId' }, { status: 400 });
    }

    if (isMockGeneration()) {
      console.log('[preview] Mock mode — returning fake taskId');
      return NextResponse.json({ taskId: `mock-${studioId}-${Date.now()}` } satisfies PreviewResponseBody);
    }

    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // Create user/booking record BEFORE calling WaveSpeed so the account
    // always exists even if AI generation fails later.
    if (isDbConfigured() && email && bookingId) {
      try {
        await setupBookingRecord(email, bookingId, studioId, buffer, feelings);
        console.log('[preview] DB setup completed in', Date.now() - t0, 'ms');
      } catch (err) {
        console.error('[preview] DB setup failed (non-fatal):', err);
      }
    } else {
      console.warn('[preview] Skipping DB setup —', {
        dbConfigured: isDbConfigured(),
        hasEmail: Boolean(email),
        hasBookingId: Boolean(bookingId),
      });
    }

    console.log('[preview] Uploading photo to WaveSpeed…');
    const imageUrl = await uploadPhotoToWaveSpeed(buffer);
    console.log('[preview] Photo uploaded to WaveSpeed:', imageUrl, 'in', Date.now() - t0, 'ms');

    const prompt = await getPrompt(studioId, 0, feelings ?? []);
    console.log('[preview] Submitting edit to WaveSpeed, prompt length:', prompt.length);

    const taskId = await submitEdit({ imageUrl, prompt, aspectRatio: '3:4', resolution: '1k' });
    console.log('[preview] WaveSpeed task created:', taskId, 'in', Date.now() - t0, 'ms');

    if (isDbConfigured() && bookingId) {
      prisma.booking
        .update({ where: { id: bookingId }, data: { wavespeedTaskId: taskId } })
        .then(() => console.log('[preview] Stored wavespeedTaskId on booking', bookingId))
        .catch((err) => console.warn('[preview] Failed to store wavespeedTaskId:', err));
    }

    console.log('[preview] POST complete, total time:', Date.now() - t0, 'ms');
    return NextResponse.json({ taskId } satisfies PreviewResponseBody);
  } catch (err) {
    console.error('[preview] POST error after', Date.now() - t0, 'ms:', err);
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
  const t0 = Date.now();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Upsert user
  const before = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const userId = await upsertUserByEmail(email);
  const isNew = !before;

  console.log('[preview] User upserted', {
    email,
    userId,
    bookingId,
    studioId,
    isNew,
    ms: Date.now() - t0,
  });

  // Detect duplicate preview attempts
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

  // Upsert booking row
  console.log('[preview] Upserting booking', bookingId);
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
  console.log('[preview] Booking upserted', bookingId, 'in', Date.now() - t0, 'ms');

  // Upload customer photo to R2
  const r2Key = `${bookingId}/customer-upload.jpg`;
  let isStored = false;
  let r2Url: string | null = null;

  if (r2IsConfigured()) {
    try {
      await uploadToR2(r2Key, photoBuffer, 'image/jpeg');
      isStored = true;
      r2Url = `r2://${r2Key}`;
      console.log('[preview] Customer photo stored in R2:', r2Key, 'in', Date.now() - t0, 'ms');
    } catch (err) {
      console.warn('[preview] R2 upload failed for customer photo:', err);
    }
  } else {
    console.warn('[preview] R2 not configured — skipping customer photo storage');
  }

  // Insert upload photo record
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
    else console.log('[preview] Upload photo record already exists (P2002 — OK)');
  });

  console.log('[preview] setupBookingRecord complete', {
    userId,
    bookingId,
    r2Url,
    isStored,
    totalMs: Date.now() - t0,
  });
}
