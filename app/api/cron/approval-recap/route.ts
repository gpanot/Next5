import { NextResponse } from 'next/server';
import { sendApprovalRecaps } from '../../../../src/server/autoSlideshow/approvalRecap';

/**
 * GET /api/cron/approval-recap — the 8 am email about today's posts still to approve (Auto Slideshow). Call every hour
 * with `Authorization: Bearer $CRON_SECRET`: each workspace gets it once, in its own morning. Idempotent.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, recaps: await sendApprovalRecaps() });
}
