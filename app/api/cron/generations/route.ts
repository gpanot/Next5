import { NextResponse } from 'next/server';
import { runGenerationTick } from '../../../../src/server/generation/poll';

export const maxDuration = 60;

/** GET /api/cron/generations — Vercel cron. Advances every in-flight batch. */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  await runGenerationTick({ budgetMs: 50_000 });
  return NextResponse.json({ ok: true, ms: Date.now() - started });
}
