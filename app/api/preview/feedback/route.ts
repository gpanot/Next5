import { NextRequest, NextResponse } from 'next/server';
import { isDbConfigured, prisma } from '../../../../src/lib/db';

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await req.json().catch(() => null);
  if (!body?.bookingId || !body?.feedback) {
    return NextResponse.json({ error: 'bookingId and feedback are required' }, { status: 400 });
  }

  const { bookingId, feedback, feedbackDetail } = body as {
    bookingId: string;
    feedback: string;
    feedbackDetail?: string;
  };

  try {
    await prisma.$executeRaw`
      UPDATE bookings
      SET preview_feedback = ${feedback},
          preview_feedback_detail = ${feedbackDetail ?? null}
      WHERE id = ${bookingId}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[preview/feedback] Failed to record feedback:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
