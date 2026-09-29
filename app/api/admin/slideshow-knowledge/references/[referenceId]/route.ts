/**
 * POST   /api/admin/slideshow-knowledge/references/[referenceId] — retry a failed import
 * DELETE /api/admin/slideshow-knowledge/references/[referenceId] — remove a post (its model stays)
 */
import type { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../src/lib/db';
import { processReference } from '../../../../../../src/server/slideshowKnowledge/importer';
import { isBusy, type ReferenceStatus } from '../../../../../../src/types/admin/slideshowKnowledge';

export const maxDuration = 120;

type Ctx = { params: Promise<{ referenceId: string }> };

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { referenceId } = await ctx.params;
  const ref = await prisma.slideshowReference.findUnique({ where: { id: referenceId }, select: { status: true } });
  if (!ref) return json({ error: 'Post not found' }, { status: 404 });
  if (isBusy(ref.status as ReferenceStatus)) return json({ error: 'This post is already importing' }, { status: 409 });
  await prisma.slideshowReference.update({ where: { id: referenceId }, data: { status: 'pending', error: null } });
  waitUntil(processReference(referenceId));
  return json({ ok: true });
});

export const DELETE = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { referenceId } = await ctx.params;
  await prisma.slideshowReference.delete({ where: { id: referenceId } });
  return json({ ok: true });
});
