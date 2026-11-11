/** POST /api/admin/script-generator/hooks — { format, goal, audience, message, credibility } → { hooks: [3] } with 3 different angles */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { generateHooks, parseHooksInput, parseModel } from '../../../../../src/server/scriptGenerator/service';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ hooks: await generateHooks(parseHooksInput(body), parseModel(body.model)) });
});
