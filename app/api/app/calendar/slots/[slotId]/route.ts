import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { markPosted, moveSlot, skipSlot, swapPhoto, undoPosted } from '../../../../../../src/server/calendar/calendar';
import { toSlotDto } from '../../../../../../src/server/calendar/dto';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { prisma } from '../../../../../../src/lib/db';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ slotId: string }> };

const withItem = async (workspaceId: string, slotId: string) => {
  const slot = await prisma.postSlot.findFirstOrThrow({
    where: { id: slotId, workspaceId },
    include: {
      item: { select: { id: true, batchId: true, r2Key: true, postKit: true, score: true, scoreDetails: true, sceneId: true, batch: { select: { name: true } } } },
      material: { select: { id: true, label: true } },
    },
  });
  return toSlotDto(slot);
};

/**
 * PATCH { action } — one endpoint for every action on a post, so the sheet never navigates.
 * `posted` fires the moment she copies the caption or saves the photo.
 */
export const PATCH = authedRoute(async (req, session, { params }: Ctx) => {
  const { slotId } = await params;
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  const action = String(body.action ?? '');

  switch (action) {
    case 'posted':
      await markPosted(ws.id, slotId, typeof body.postUrl === 'string' && body.postUrl.trim() ? body.postUrl.trim().slice(0, 500) : null);
      break;
    case 'undo':
      await undoPosted(ws.id, slotId);
      break;
    case 'skip':
      await skipSlot(ws.id, slotId);
      break;
    case 'move':
      await moveSlot(ws.id, slotId, String(body.date ?? ''));
      break;
    case 'swap':
      await swapPhoto(ws.id, slotId, String(body.itemId ?? ''));
      break;
    default:
      throw new HttpError(400, 'invalid_action', 'Unknown action.');
  }
  return NextResponse.json({ slot: await withItem(ws.id, slotId) });
});
