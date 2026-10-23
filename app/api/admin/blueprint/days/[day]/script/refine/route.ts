import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../../src/server/admin/route';
import { parseDayIndex } from '../../../../../../../../src/server/blueprint/input';
import { changeDayScript, parseInstruction } from '../../../../../../../../src/server/blueprint/scripts';
import { readJsonObject } from '../../../../../../../../src/server/http';

export const maxDuration = 120;

type Ctx = { params: Promise<{ day: string }> };

/** POST /api/admin/blueprint/days/[day]/script/refine — { instruction } → { refused, message, script, blueprint }. */
export const POST = adminRoute(async (req: NextRequest, { params }: Ctx) => {
  const body = await readJsonObject(req);
  const dayIndex = parseDayIndex((await params).day);
  return json(await changeDayScript({ workspaceId: null, dayIndex }, parseInstruction(body.instruction)));
});
