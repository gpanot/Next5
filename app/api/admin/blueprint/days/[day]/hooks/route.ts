import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { parseDayIndex } from '../../../../../../../src/server/blueprint/input';
import { dayHookOptions } from '../../../../../../../src/server/blueprint/scripts';

export const maxDuration = 120;

type Ctx = { params: Promise<{ day: string }> };

/** POST /api/admin/blueprint/days/[day]/hooks → { hooks: 3 options }. */
export const POST = adminRoute(async (_req: NextRequest, { params }: Ctx) => {
  const dayIndex = parseDayIndex((await params).day);
  return json({ hooks: await dayHookOptions({ workspaceId: null, dayIndex }) });
});
