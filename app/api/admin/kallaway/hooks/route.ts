/** POST /api/admin/kallaway/hooks — { plan } → { original, variants: [3] } using Kallaway's 6 hook power words */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { generateKallawayHooks, parsePlan } from '../../../../../src/server/kallaway/hooks';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json(await generateKallawayHooks(parsePlan(body)));
});
