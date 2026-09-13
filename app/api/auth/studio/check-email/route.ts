/**
 * POST /api/auth/studio/check-email
 *
 * Returns whether the given email belongs to an account that has at least one
 * confirmed booking (i.e., an active studio). Used on the upload step to
 * detect existing accounts and surface a "Go to your Studio?" prompt instead
 * of running a new preview generation.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbConfigured } from '../../../../../src/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const trimmed = email?.trim().toLowerCase() ?? '';

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      return NextResponse.json({ exists: false });
    }

    if (!isDbConfigured()) {
      return NextResponse.json({ exists: false });
    }

    const user = await prisma.user.findFirst({
      where: { email: trimmed },
      include: {
        bookings: {
          where: { paymentStatus: 'confirmed' },
          take: 1,
          select: { id: true },
        },
      },
    });

    const exists = (user?.bookings.length ?? 0) > 0;
    return NextResponse.json({ exists });
  } catch (err) {
    console.error('[check-email] Error:', err);
    return NextResponse.json({ exists: false });
  }
}
