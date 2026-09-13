import { NextResponse } from 'next/server';
import { runGenerationTick } from '../../../../src/server/generation/poll';
import { runBillingDaily } from '../../../../src/server/lifecycle/billingDaily';

export const maxDuration = 60;

/** GET /api/cron/billing-daily — Vercel cron (daily). Grants, expiries, reminders, plus a generation sweep for lost webhooks. Idempotent. */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const summary = await runBillingDaily();
  await runGenerationTick({ budgetMs: 20_000 });
  return NextResponse.json({ ok: true, summary });
}
