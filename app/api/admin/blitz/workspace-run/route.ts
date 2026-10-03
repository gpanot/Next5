import { NextResponse } from 'next/server';
import { HttpError } from '../../../../../src/server/http';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { workspaceRunId } from '../../../../../src/server/labs/workspaceRun';

// A workspace whose site has no profile yet is crawled first (site crawl + OpenAI, up to ~90 s).
export const maxDuration = 120;

/**
 * POST /api/admin/blitz/workspace-run
 * Returns: { runId } — the Campaign Studio run of the caller's workspace (X-Workspace-Id), built from its website's
 * company profile. Users only: the admin tab picks runs by hand.
 */
export const POST = labRoute(async (_req, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Admins pick a run in the admin tab.');
  return NextResponse.json({ runId: await workspaceRunId(access.workspaceId) });
});
