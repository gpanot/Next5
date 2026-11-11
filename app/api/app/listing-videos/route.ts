import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { listWorkspaceVideos } from '../../../../src/server/realtorVideo/library';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

/** GET ?active=1 — the workspace's listing videos, newest first (only those still being made with active=1). */
export const GET = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const active = new URL(req.url).searchParams.get('active') === '1';
  return NextResponse.json({ videos: await listWorkspaceVideos(ws, { active, limit: active ? 20 : 60 }) });
});
