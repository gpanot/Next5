/**
 * GET /api/slideshow/workspaces/[workspaceId]/customer-industries — { industries, edited, ready }
 * PUT /api/slideshow/workspaces/[workspaceId]/customer-industries — { industries: string[] } (5 at most). Saves the list,
 *     rewrites the Audience, then updates the Blitz and carousel banks after the response. Owner of the workspace, or an admin.
 */
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { audit } from '../../../../../../src/server/admin/route';
import type { Access } from '../../../../../../src/server/autoSlideshow/access';
import { slideshowRoute } from '../../../../../../src/server/autoSlideshow/route';
import { requireSlideshowWorkspace } from '../../../../../../src/server/autoSlideshow/workspaces';
import { readJsonObject } from '../../../../../../src/server/http';
import { editCustomerIndustries, getCustomerIndustries, parseIndustries } from '../../../../../../src/server/studio/customerIndustries';
import { followIndustriesEdit } from '../../../../../../src/server/studio/followIndustriesEdit';

// The stories and carousel parts for an edited list are written after the response.
export const maxDuration = 300;

type Ctx = { params: Promise<{ workspaceId: string }> };

const assertAccess = async (access: Access, workspaceId: string) => {
  if (!access.admin) await requireSlideshowWorkspace(access.userId, workspaceId);
};

export const GET = slideshowRoute(async (_req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  await assertAccess(access, workspaceId);
  return NextResponse.json(await getCustomerIndustries(workspaceId));
});

export const PUT = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { workspaceId } = await ctx.params;
  await assertAccess(access, workspaceId);
  const industries = parseIndustries((await readJsonObject(req)).industries);
  const edit = await editCustomerIndustries(workspaceId, industries, access.admin ? null : access.userId);
  if (access.admin) await audit('workspace.customer_industries', 'workspace', workspaceId, { industries });
  if (edit.changed) waitUntil(followIndustriesEdit(edit));
  return NextResponse.json(edit.dto);
});
