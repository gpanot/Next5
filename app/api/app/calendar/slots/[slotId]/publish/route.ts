import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../../src/server/api';
import { toSlotDto } from '../../../../../../../src/server/calendar/dto';
import { HttpError, readJsonObject } from '../../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../../src/server/rateLimit';
import { publishSlot } from '../../../../../../../src/server/social/connections';
import { isSocialProvider } from '../../../../../../../src/server/social/types';
import { requireWorkspace } from '../../../../../../../src/server/workspaces/workspaces';

type Ctx = RouteContext<'/api/app/calendar/slots/[slotId]/publish'>;

/** POST { provider } — "Post now": sends this day's photo and caption to the connected account. */
export const POST = authedRoute<Ctx>(async (req, session, ctx) => {
  const { slotId } = await ctx.params;
  const body = await readJsonObject(req);
  if (!isSocialProvider(body.provider)) throw new HttpError(400, 'invalid_provider', 'Pick Instagram or TikTok.');
  // TikTok allows 6 posting calls a minute per account; keep well under it.
  await enforceRateLimit(`social-publish:${session.userId}`, 20, 3600);
  const ws = await requireWorkspace(session.userId, 'brand');
  await publishSlot(ws.id, slotId, body.provider);
  const slot = await prisma.postSlot.findFirstOrThrow({
    where: { id: slotId, workspaceId: ws.id },
    include: {
      item: { select: { id: true, batchId: true, r2Key: true, postKit: true, score: true, scoreDetails: true, sceneId: true, batch: { select: { name: true } } } },
      material: { select: { id: true, label: true } },
    },
  });
  return NextResponse.json({ slot: await toSlotDto(slot) });
});
