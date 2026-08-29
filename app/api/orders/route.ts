import { NextRequest, NextResponse } from 'next/server';
import { isMockGeneration } from '../../../src/lib/mock';
import { prisma, isDbConfigured } from '../../../src/lib/db';
import { signMagicToken } from '../../../src/lib/studio-auth';
import { sendEmail } from '../../../src/lib/maileroo';

export type OrderPayload = {
  bookingId: string;
  studioId: string;
  studioTitle: string;
  directorName: string;
  directorId: string;
  email: string;
  feelings: string[];
  goals: string[];
  amountVnd: number;
  discountPercent?: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as OrderPayload;

  if (isMockGeneration()) {
    console.warn('[orders] Mock mode — skipping DB update.', body);
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!isDbConfigured()) {
    console.warn('[orders] DB not configured — skipping order record.', body);
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await prisma.booking.update({
      where: { id: body.bookingId },
      data: {
        routeTitle: body.studioTitle,
        directorId: body.directorId,
        directorName: body.directorName,
        feelings: body.feelings,
        goals: body.goals,
        amountVnd: body.amountVnd,
        discountPercent: body.discountPercent ?? null,
        paymentStatus: 'confirmed',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error';
    console.error('[orders] Booking update error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  // Send a magic-link email so the customer can access their studio post-payment.
  try {
    const token = signMagicToken(body.email);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const link = `${appUrl}/studio?token=${token}`;

    await sendEmail({
      to: body.email,
      subject: 'Your photos are being created — access your Next5 Studio',
      html: `
        <div style="font-family:serif;max-width:480px;margin:0 auto;padding:40px 24px;">
          <h1 style="font-size:28px;letter-spacing:0.08em;text-transform:uppercase;color:#111;margin:0 0 8px;">Your photos are on their way</h1>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 32px;">
            Thank you for booking with Next5. Your AI photographer is creating your photos now.
            Click below to access your studio and view them when they're ready.
          </p>
          <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 28px;font-family:serif;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;border-radius:12px;">
            Open my studio
          </a>
          <p style="font-size:12px;color:#999;margin:32px 0 0;">This link expires in 15 minutes. You can always request a new one from the studio page.</p>
        </div>
      `,
      plain: `Your photos are on their way\n\nThank you for booking with Next5. Your AI photographer is creating your photos now.\n\nClick the link below to access your studio (expires in 15 minutes):\n\n${link}\n\nYou can always request a new link from the studio page.`,
    });
    console.log('[orders] Studio access email sent to:', body.email);
  } catch (err) {
    console.warn('[orders] Magic-link email failed (non-fatal):', err);
  }

  return NextResponse.json({ ok: true });
}
