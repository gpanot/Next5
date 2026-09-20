import { NextResponse } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { listCloneVideos } from '../../../../../../src/server/admin/cloneVideos';

/** GET /api/admin/ugc-lab/clone/library — list all clone videos, newest first. */
export const GET = adminRoute(async () => {
  const videos = await listCloneVideos();
  return NextResponse.json({ videos });
});
