import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { patchIdea } from '../../../../../../src/server/labs/calendarIdeas';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import type { IdeaPatch } from '../../../../../../src/types/admin/calendarIdeas';

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: NonNullable<IdeaPatch['status']>[] = ['proposed', 'kept', 'discarded'];

/** The patch, with only the fields it may carry. */
const patchOf = (raw: unknown): IdeaPatch => {
  const b = (raw ?? {}) as Record<string, unknown>;
  const patch: IdeaPatch = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status as NonNullable<IdeaPatch['status']>)) throw new HttpError(400, 'invalid_status', 'Unknown status.');
    patch.status = b.status as IdeaPatch['status'];
  }
  if (typeof b.plannedAt === 'string') patch.plannedAt = b.plannedAt;
  if (typeof b.hookId === 'string') patch.hookId = b.hookId;
  const a = b.audio as Record<string, unknown> | undefined;
  if (a && typeof a.assetKey === 'string' && typeof a.url === 'string' && typeof a.label === 'string') {
    patch.audio = { assetKey: a.assetKey, url: a.url, label: a.label.slice(0, 200), startAt: typeof a.startAt === 'number' && a.startAt >= 0 ? a.startAt : 0 };
  }
  return patch;
};

/** PATCH /api/admin/blitz/ideas/[id] — { status?, plannedAt?, hookId?, audio? } → the updated ideas list. */
export const PATCH = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  const { id } = await ctx.params;
  return NextResponse.json(await patchIdea(access.workspaceId, id, patchOf(await req.json().catch(() => null))));
});
