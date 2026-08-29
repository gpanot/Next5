/**
 * POST /api/auth/studio/magic
 *
 * Sends a magic-link email to the given address.
 * The link points to /studio?token=<jwt> and expires in 15 minutes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDbConfigured } from '../../../../../src/lib/db';
import { signMagicToken } from '../../../../../src/lib/studio-auth';

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const trimmed = email?.trim().toLowerCase() ?? '';

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json({ error: 'Studio service unavailable' }, { status: 503 });
    }

    // Ensure the user exists in the DB (creates a row the first time)
    await prisma.user.upsert({
      where: { email: trimmed },
      update: {},
      create: { email: trimmed },
    });

    const token = signMagicToken(trimmed);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const link = `${appUrl}/studio?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Next5 Studio <studio@next5.app>',
        to: trimmed,
        subject: 'Access your Next5 Studio',
        html: `
          <div style="font-family:serif;max-width:480px;margin:0 auto;padding:40px 24px;">
            <h1 style="font-size:28px;letter-spacing:0.08em;text-transform:uppercase;color:#111;margin:0 0 8px;">Your Studio</h1>
            <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 32px;">
              Click the link below to access your Next5 photo studio. This link expires in 15 minutes.
            </p>
            <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;font-family:serif;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;border-radius:12px;">
              Open my studio
            </a>
            <p style="font-size:12px;color:#999;margin:32px 0 0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } else {
      // Dev mode — log the link so you can test without an email provider
      console.log('[studio/magic] Dev mode — magic link:', link);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[studio/magic] Error:', err);
    return NextResponse.json({ error: 'Failed to send login link' }, { status: 500 });
  }
}
