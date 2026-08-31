/**
 * POST /api/studio/regenerate
 *
 * Allows a player to regenerate individual photos (or the full set) up to 2 times
 * per booking, within 24 hours of the booking being created.
 *
 * When `sceneIndex` is provided, only that specific generated photo is deleted
 * and the booking status is reset so the client re-generates just that one scene.
 * Without `sceneIndex`, all generated photos are deleted (legacy full-set behaviour).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbConfigured } from '../../../../src/lib/db';
import { verifySessionToken } from '../../../../src/lib/studio-auth';

const REGEN_LIMIT = 2;
const REGEN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export type RegenerateResponseBody =
  | { ok: true; regenerate_count: number; remaining: number }
  | { ok: false; error: string };

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'Not available' } satisfies RegenerateResponseBody, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' } satisfies RegenerateResponseBody, { status: 401 });
  }

  let userId: string;
  try {
    const payload = verifySessionToken(token);
    userId = payload.userId;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' } satisfies RegenerateResponseBody, { status: 401 });
  }

  let bookingId: string;
  let sceneIndex: number | undefined;
  let reason: string | undefined;
  try {
    const body = (await req.json()) as { bookingId?: string; sceneIndex?: number; reason?: string };
    bookingId = body.bookingId ?? '';
    sceneIndex = typeof body.sceneIndex === 'number' ? body.sceneIndex : undefined;
    reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' } satisfies RegenerateResponseBody, { status: 400 });
  }

  if (!bookingId) {
    return NextResponse.json({ ok: false, error: 'bookingId is required' } satisfies RegenerateResponseBody, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, regenerateCount: true, createdAt: true },
  });

  if (!booking || booking.userId !== userId) {
    return NextResponse.json({ ok: false, error: 'Booking not found' } satisfies RegenerateResponseBody, { status: 404 });
  }

  // Enforce the 24-hour window from booking creation
  const ageMs = Date.now() - booking.createdAt.getTime();
  if (ageMs > REGEN_WINDOW_MS) {
    return NextResponse.json(
      { ok: false, error: 'The 24-hour regeneration window for this shoot has expired.' } satisfies RegenerateResponseBody,
      { status: 403 },
    );
  }

  // Enforce the 2-regeneration limit
  if (booking.regenerateCount >= REGEN_LIMIT) {
    return NextResponse.json(
      { ok: false, error: 'You have used both regenerations for this shoot.' } satisfies RegenerateResponseBody,
      { status: 403 },
    );
  }

  // Delete the target photo(s): one specific scene when sceneIndex is given, all AI shots otherwise
  await prisma.photo.deleteMany({
    where: sceneIndex !== undefined
      ? { bookingId, type: 'generated', sceneIndex }
      : { bookingId, type: 'generated' },
  });

  // Increment counter, record timestamp, reset shoot status
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      regenerateCount: { increment: 1 },
      regenerateLastAt: new Date(),
      shootStatus: 'creating',
    },
    select: { regenerateCount: true },
  });

  // Record the regeneration event for analytics
  await prisma.bookingRegeneration.create({
    data: {
      bookingId,
      sceneIndex: sceneIndex ?? null,
      reason: reason ?? null,
    },
  });

  const remaining = REGEN_LIMIT - updated.regenerateCount;

  return NextResponse.json({ ok: true, regenerate_count: updated.regenerateCount, remaining } satisfies RegenerateResponseBody);
}
