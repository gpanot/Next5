import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { isSlideTheme, slideThemeOf } from '../../../../../../src/lib/slideThemes';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

type Ctx = { params: Promise<{ campaignId: string }> };

const campaignOf = async (userId: string, campaignId: string) => {
  const ws = await requireWorkspace(userId, 'brand');
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: ws.id }, select: { id: true, slideTheme: true, status: true } });
  if (!campaign) throw new HttpError(404, 'campaign_not_found', 'That plan is gone.');
  return campaign;
};

/** GET — the look of this plan's listing slideshows. */
export const GET = authedRoute(async (_req, session, { params }: Ctx) => {
  const campaign = await campaignOf(session.userId, (await params).campaignId);
  return NextResponse.json({ theme: slideThemeOf(campaign.slideTheme) });
});

/** PUT { theme } — pick the look while the plan is still a draft (its slideshows are made on approve). */
export const PUT = authedRoute(async (req, session, { params }: Ctx) => {
  const campaign = await campaignOf(session.userId, (await params).campaignId);
  const body = await readJsonObject(req);
  if (!isSlideTheme(body.theme)) throw new HttpError(400, 'invalid_theme', 'Unknown slideshow theme.');
  if (campaign.status !== 'draft') throw new HttpError(409, 'not_draft', 'This plan is already approved.');
  await prisma.campaign.update({ where: { id: campaign.id }, data: { slideTheme: body.theme } });
  return NextResponse.json({ theme: body.theme });
});
