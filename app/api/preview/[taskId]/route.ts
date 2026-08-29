import { NextRequest, NextResponse } from 'next/server';
import { pollTask } from '../../../../src/lib/wavespeed';
import { isMockGeneration } from '../../../../src/lib/mock';
import { photoRoutes } from '../../../../src/data/routes';
import { mirrorToR2, r2IsConfigured } from '../../../../src/lib/r2';
import { prisma, isDbConfigured } from '../../../../src/lib/db';

export type PollResponseBody = {
  status: string;
  url: string | null;
  error: string | null;
};

const MOCK_PREFIX = 'mock-';
const MOCK_GENERATION_MS = 5000;

const pollMockTask = (taskId: string): PollResponseBody => {
  const rest = taskId.slice(MOCK_PREFIX.length);
  const lastDash = rest.lastIndexOf('-');
  const studioId = rest.slice(0, lastDash);
  const startedAt = Number(rest.slice(lastDash + 1));

  if (Date.now() - startedAt < MOCK_GENERATION_MS) {
    return { status: 'processing', url: null, error: null };
  }

  const route = photoRoutes.find((r) => r.id === studioId) ?? photoRoutes[0];
  return { status: 'completed', url: route.shots[0].src, error: null };
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;

    if (isMockGeneration() || taskId.startsWith(MOCK_PREFIX)) {
      return NextResponse.json(pollMockTask(taskId));
    }

    const result = await pollTask(taskId);

    console.log('[preview/poll]', taskId, '→ status:', result.status, result.url ? `url: ${result.url}` : '');

    if (result.status === 'completed' && result.url && isDbConfigured()) {
      persistPreviewPhoto(taskId, result.url).catch((err) => {
        console.error('[preview/poll] Failed to persist preview photo:', err);
      });
    }

    return NextResponse.json(result satisfies PollResponseBody);
  } catch (err) {
    console.error('[preview/poll] GET poll error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Poll error', status: 'failed', url: null },
      { status: 500 },
    );
  }
}

async function persistPreviewPhoto(taskId: string, wavespeedUrl: string): Promise<void> {
  const t0 = Date.now();
  console.log('[preview/poll] Persisting preview photo for taskId:', taskId, 'url:', wavespeedUrl);

  const booking = await prisma.booking.findFirst({
    where: { wavespeedTaskId: taskId },
    select: { id: true, userId: true },
  });

  if (!booking) {
    console.warn('[preview/poll] No booking found for taskId:', taskId, '— cannot persist photo');
    return;
  }

  const { id: bookingId, userId } = booking;
  console.log('[preview/poll] Found booking', bookingId, 'for taskId', taskId);

  const r2Key = `${bookingId}/shot-01.jpg`;
  let isStored = false;

  try {
    if (r2IsConfigured()) {
      await mirrorToR2(wavespeedUrl, r2Key);
      isStored = true;
      console.log('[preview/poll] Preview photo mirrored to R2:', r2Key, 'in', Date.now() - t0, 'ms');
    } else {
      console.warn('[preview/poll] R2 not configured — storing wavespeedUrl only');
    }
  } catch (err) {
    console.warn('[preview/poll] R2 mirror failed for preview shot:', err);
  }

  await prisma.photo.create({
    data: {
      bookingId,
      userId,
      type: 'preview',
      sceneIndex: 0,
      r2Key,
      wavespeedUrl,
      isStored,
    },
  }).catch((err) => {
    if (err?.code !== 'P2002') console.warn('[preview/poll] Failed to insert preview photo:', err);
    else console.log('[preview/poll] Preview photo record already exists (P2002 — OK)');
  });

  await prisma.booking
    .update({ where: { id: bookingId }, data: { shootStatus: 'preview_ready' } })
    .then(() => console.log('[preview/poll] Booking', bookingId, 'status → preview_ready'))
    .catch((err) => console.warn('[preview/poll] Failed to update shootStatus:', err));

  console.log('[preview/poll] persistPreviewPhoto complete for', bookingId, 'in', Date.now() - t0, 'ms');
  console.log('[preview/poll] SUMMARY ✓', {
    bookingId,
    userId,
    wavespeedUrl,
    r2Key,
    isStored,
  });
}
