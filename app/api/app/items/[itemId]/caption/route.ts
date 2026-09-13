import { NextResponse } from 'next/server';
import type { ThemeScene } from '../../../../../../src/content/business/catalog/types';
import { prisma } from '../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../src/server/api';
import { generateCaption } from '../../../../../../src/server/captions';
import { getActivePlan } from '../../../../../../src/server/generation/createBatch';
import { HttpError } from '../../../../../../src/server/http';

type Ctx = RouteContext<'/api/app/items/[itemId]/caption'>;

/** POST /api/app/items/[itemId]/caption — Pro only; cached on the item. */
export const POST = authedRoute<Ctx>(async (_req, session, ctx) => {
  const { itemId } = await ctx.params;
  const item = await prisma.batchItem.findFirst({
    where: { id: itemId, batch: { workspace: { ownerUserId: session.userId } } },
    include: { batch: { include: { workspace: true, theme: true } } },
  });
  if (!item) throw new HttpError(404, 'item_not_found', 'Photo not found.');
  if (item.caption) return NextResponse.json({ caption: item.caption });
  const plan = await getActivePlan(item.batch.workspaceId);
  if (!plan?.captions) throw new HttpError(403, 'plan_required', 'Captions are included in Pro.');

  const scenes = (item.batch.theme?.scenes ?? []) as unknown as ThemeScene[];
  const caption = await generateCaption({
    industry: item.batch.workspace.industry,
    themeTitle: item.batch.theme?.title ?? 'New photos',
    sceneLabel: scenes.find((s) => s.id === item.sceneId)?.label ?? 'Portrait',
    businessName: item.batch.workspace.name,
    handle: item.batch.workspace.handle,
  });
  await prisma.batchItem.update({ where: { id: item.id }, data: { caption } });
  return NextResponse.json({ caption });
});
