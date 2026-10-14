import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from '../../../../../../src/server/http';
import { patchIdea } from '../../../../../../src/server/labs/calendarIdeas';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import type { IdeaPatch } from '../../../../../../src/types/admin/calendarIdeas';
import { isBlitzVoice } from '../../../../../../src/types/admin/blitzVoice';

type Ctx = { params: Promise<{ id: string }> };

/** Another first line fits its caption again: two vision calls, up to ~75 s when the models are slow. */
export const maxDuration = 120;

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
  if (b.voice !== undefined) {
    if (!isBlitzVoice(b.voice)) throw new HttpError(400, 'invalid_voice', 'Unknown voice.');
    patch.voice = b.voice;
  }
  if (b.media !== undefined) {
    const m = (b.media ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(m.shot) || typeof m.assetKey !== 'string') throw new HttpError(400, 'invalid_media', 'Pick a clip.');
    patch.media = { shot: m.shot as number, assetKey: m.assetKey };
  }
  return patch;
};

/** PATCH /api/admin/blitz/ideas/[id] — { status?, plannedAt?, hookId?, voice?, media? } → the updated ideas list. */
export const PATCH = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Ideas belong to a workspace.');
  const { id } = await ctx.params;
  return NextResponse.json(await patchIdea(access.workspaceId, id, patchOf(await req.json().catch(() => null))));
});
