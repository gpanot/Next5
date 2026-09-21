import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { previewFor, startPreview } from '../../../../../../src/server/sets/preview';

type Ctx = { params: Promise<{ setId: string }> };

/** POST — start the free "preview on me" photos for this style (once). Returns where the preview is. */
export const POST = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { setId } = await ctx.params;
  await enforceRateLimit(`set-preview:${session.userId}`, 30, 86400);
  const set = await prisma.studioSet.findFirst({ where: { id: setId, workspace: { ownerUserId: session.userId } }, include: { workspace: true } });
  if (!set) throw new HttpError(404, 'set_not_found', 'Style not found.');
  await startPreview(set.workspace, set.id);
  return NextResponse.json({ preview: await previewFor(set.id) });
});
