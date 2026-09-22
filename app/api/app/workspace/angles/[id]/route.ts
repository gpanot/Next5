import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import type { ProductLineDto } from '../../../../../../src/types/business/me';

const isProduct = (v: unknown): v is ProductLineDto => v === 'brand' || v === 'shop';

type Ctx = { params: Promise<{ id: string }> };

// ── DELETE /api/app/workspace/angles/[id]?product=brand ──────────────────────

export const DELETE = authedRoute<Ctx>(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const product = new URL(req.url).searchParams.get('product');
  if (!isProduct(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');

  const angle = await prisma.workspaceAngle.findUnique({
    where: { id },
    select: { id: true, workspace: { select: { ownerUserId: true } } },
  });
  if (!angle || angle.workspace.ownerUserId !== session.userId) throw new HttpError(404, 'not_found', 'Angle not found.');

  await prisma.workspaceAngle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

// ── PATCH /api/app/workspace/angles/[id] — rename a single angle ─────────────

export const PATCH = authedRoute<Ctx>(async (req, session, ctx) => {
  const { id } = await ctx.params;
  const body = await readJsonObject(req);
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 100) : '';
  if (!label) throw new HttpError(400, 'label_required', 'Label is required.');

  const angle = await prisma.workspaceAngle.findUnique({
    where: { id },
    select: { id: true, workspace: { select: { ownerUserId: true } } },
  });
  if (!angle || angle.workspace.ownerUserId !== session.userId) throw new HttpError(404, 'not_found', 'Angle not found.');

  const updated = await prisma.workspaceAngle.update({
    where: { id },
    data: { label },
    select: { id: true, label: true, weight: true, position: true, source: true },
  });
  return NextResponse.json(updated);
});
