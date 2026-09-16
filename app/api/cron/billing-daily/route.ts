import { NextResponse } from 'next/server';
import { runDueAutopilot } from '../../../../src/server/calendar/autopilot';
import { sendWeeklyDigests } from '../../../../src/server/calendar/digest';
import { runGenerationTick } from '../../../../src/server/generation/poll';
import { runBillingDaily } from '../../../../src/server/lifecycle/billingDaily';
import { runDueDrops } from '../../../../src/server/shop/drops';
import { syncDueConnections } from '../../../../src/server/shopImport/service';

export const maxDuration = 60;

/** GET /api/cron/billing-daily — Vercel cron (daily). Grants, expiries, reminders, plus a generation sweep for lost webhooks. Idempotent. */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const summary = await runBillingDaily();
  const storeSyncs = await syncDueConnections().catch(() => 0);
  const drops = await runDueDrops().catch(() => 0);
  const autopilot = await runDueAutopilot().catch(() => 0);
  const digests = await sendWeeklyDigests().catch(() => 0);
  await runGenerationTick({ budgetMs: 20_000 });
  return NextResponse.json({ ok: true, summary, storeSyncs, drops, autopilot, digests });
}
