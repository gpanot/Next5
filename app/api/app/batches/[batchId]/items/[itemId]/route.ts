import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../../src/server/api';
import { removeFromCalendar } from '../../../../../../../src/server/calendar/calendar';
import { requireOwnedBatch } from '../../../../../../../src/server/generation/access';
import { toItemDto } from '../../../../../../../src/server/generation/dto';
import { HttpError, readJsonObject } from '../../../../../../../src/server/http';
import { prisma } from '../../../../../../../src/lib/db';

type Ctx = RouteContext<'/api/app/batches/[batchId]/items/[itemId]'>;

/** PATCH …/items/[itemId] — { favorite?: boolean, rating?: -1 | 1 | null, archived?: boolean } */
export const PATCH = authedRoute<Ctx>(async (req, session, ctx) => {
  const { batchId, itemId } = await ctx.params;
  const batch = await requireOwnedBatch(session.userId, batchId);
  const body = await readJsonObject(req);

  const data: { favorite?: boolean; rating?: number | null; archivedAt?: Date | null } = {};
  if (typeof body.favorite === 'boolean') data.favorite = body.favorite;
  if (body.rating === null || body.rating === 1 || body.rating === -1) data.rating = body.rating;
  if (typeof body.archived === 'boolean') data.archivedAt = body.archived ? new Date() : null;
  if (Object.keys(data).length === 0) throw new HttpError(400, 'invalid_body', 'Nothing to update.');

  const found = await prisma.batchItem.findFirst({ where: { id: itemId, batchId }, select: { id: true } });
  if (!found) throw new HttpError(404, 'item_not_found', 'Photo not found.');
  const item = await prisma.batchItem.update({ where: { id: itemId }, data });
  // An archived photo leaves the calendar too (a post she already marked done stays).
  if (body.archived === true) await removeFromCalendar(batch.workspaceId, itemId);
  const slot = await prisma.postSlot.findFirst({ where: { itemId }, select: { scheduledFor: true, status: true } });
  return NextResponse.json({ item: await toItemDto(item, slot) });
});
