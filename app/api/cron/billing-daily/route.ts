import { NextResponse } from 'next/server';
import { runBillingDaily } from '../../../../src/server/lifecycle/billingDaily';

export const maxDuration = 60;

/** GET /api/cron/billing-daily — Vercel cron (daily). Grants, expiries, reminders. Idempotent. */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, summary: await runBillingDaily() });
}
