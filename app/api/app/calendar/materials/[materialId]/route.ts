import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { archiveMaterial } from '../../../../../../src/server/calendar/materials';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ materialId: string }> };

/** DELETE — takes a photo out of the drop box before it is used. */
export const DELETE = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  await archiveMaterial(ws.id, (await params).materialId);
  return NextResponse.json({ ok: true });
});
