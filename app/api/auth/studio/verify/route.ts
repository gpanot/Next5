/**
 * POST /api/auth/studio/verify
 *
 * Verifies the short-lived magic token from the email link,
 * then returns a long-lived session token for the studio portal.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { verifyMagicToken, signSessionToken } from '../../../../../src/lib/studio-auth';

export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token?: string };

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const payload = verifyMagicToken(token);

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {},
      create: { email: payload.email },
      select: { id: true, email: true },
    });

    const sessionToken = signSessionToken(user.id, user.email);

    return NextResponse.json({ token: sessionToken, email: user.email, userId: user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
