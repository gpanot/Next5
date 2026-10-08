/**
 * GET /api/admin/workspaces/[workspaceId]/blitz-matrix — the workspace's Blitz Script Banks: audiences × stories × hooks,
 * with how many idea cards each story gave. Admin only.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { blitzBankMatrix } from '../../../../../../src/server/admin/blitzBankMatrix';

type Ctx = { params: Promise<{ workspaceId: string }> };

export const GET = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  return json(await blitzBankMatrix(workspaceId));
});
