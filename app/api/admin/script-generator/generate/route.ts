/** POST /api/admin/script-generator/generate — { format, structure, goal, audience, message, credibility } → script + director's note */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { generateScript, parseGenerateInput, parseModel } from '../../../../../src/server/scriptGenerator/service';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ script: await generateScript(parseGenerateInput(body), parseModel(body.model)) });
});
