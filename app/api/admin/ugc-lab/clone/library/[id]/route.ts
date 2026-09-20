import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../../src/server/admin/route';
import { deleteCloneVideo, getCloneVideo } from '../../../../../../../src/server/admin/cloneVideos';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/ugc-lab/clone/library/:id — single video (refreshes if generating). */
export const GET = adminRoute(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const video = await getCloneVideo(id);
  return NextResponse.json({ video });
});

/** DELETE /api/admin/ugc-lab/clone/library/:id — remove from DB and R2. */
export const DELETE = adminRoute(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await deleteCloneVideo(id);
  return NextResponse.json({ ok: true });
});
