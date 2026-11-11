import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { parseDayIndex } from '../../../../../../../src/server/blueprint/input';
import { parseChosenHook, writeDayScript } from '../../../../../../../src/server/blueprint/scripts';
import { readJsonObject } from '../../../../../../../src/server/http';

/** Model calls take 10 to 60 seconds. Also set in vercel.json. */
export const maxDuration = 120;

type Ctx = { params: Promise<{ day: string }> };

/** POST /api/admin/blueprint/days/[day]/script — { hook? } → the script, saved on the day. */
export const POST = adminRoute(async (req: NextRequest, { params }: Ctx) => {
  const body = await readJsonObject(req);
  const dayIndex = parseDayIndex((await params).day);
  return json(await writeDayScript({ workspaceId: null, dayIndex }, parseChosenHook(body.hook)));
});
