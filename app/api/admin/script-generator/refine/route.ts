/** POST /api/admin/script-generator/refine — { script, instruction } → edited script, or a refusal when off topic */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { parseModel, refineScript } from '../../../../../src/server/scriptGenerator/service';
import type { GeneratedScript } from '../../../../../src/types/admin/scriptGenerator';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { script?: GeneratedScript; instruction?: unknown; model?: unknown };
  if (!body.script || !Array.isArray(body.script.beats)) return json({ error: 'Script and instruction are required.' }, { status: 400 });
  return json(await refineScript(body.script, body.instruction, parseModel(body.model)));
});
