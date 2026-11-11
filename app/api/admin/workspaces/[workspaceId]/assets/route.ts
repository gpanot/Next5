/** GET /api/admin/workspaces/[workspaceId]/assets?type=blitz|hook|brand&offset=0 — the workspace's generated pictures and prompts, newest first. */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { workspaceAssets } from '../../../../../../src/server/admin/workspaceAssets';
import { WORKSPACE_ASSET_TYPES, type WorkspaceAssetType } from '../../../../../../src/types/admin/workspaceAssets';

type Ctx = { params: Promise<{ workspaceId: string }> };

const parseType = (value: string | null): WorkspaceAssetType | null =>
  WORKSPACE_ASSET_TYPES.find((t) => t === value) ?? null;

const parseOffset = (value: string | null): number => {
  const offset = Number(value);
  return Number.isInteger(offset) && offset > 0 ? offset : 0;
};

export const GET = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const { workspaceId } = await ctx.params;
  const params = req.nextUrl.searchParams;
  return json(await workspaceAssets(workspaceId, parseType(params.get('type')), parseOffset(params.get('offset'))));
});
