import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';
import type { ProductLineDto } from '../../../../../src/types/business/me';

const isProduct = (v: unknown): v is ProductLineDto => v === 'brand' || v === 'shop';

// ── GET /api/app/workspace/angles?product=brand ───────────────────────────────

export const GET = authedRoute(async (req, session) => {
  const product = new URL(req.url).searchParams.get('product');
  if (!isProduct(product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const ws = await requireWorkspace(session.userId, product);
  const angles = await prisma.workspaceAngle.findMany({
    where: { workspaceId: ws.id },
    orderBy: { position: 'asc' },
    select: { id: true, label: true, weight: true, position: true, source: true },
  });
  return NextResponse.json({
    angles,
    genState: ws.anglesGenState,
    genAt: ws.anglesGenAt,
    // Also return the latest brand extract so the brand page can refresh after generation
    brandExtract: ws.brandExtract ?? null,
  });
});

// ── POST /api/app/workspace/angles — add a custom angle ───────────────────────

export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProduct(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 100) : '';
  if (!label) throw new HttpError(400, 'label_required', 'Angle label is required.');

  const ws = await requireWorkspace(session.userId, body.product);

  // Count existing to set position
  const count = await prisma.workspaceAngle.count({ where: { workspaceId: ws.id } });

  const angle = await prisma.workspaceAngle.create({
    data: {
      workspaceId: ws.id,
      label,
      weight: Math.max(0, Math.floor(100 / (count + 1))),
      position: count,
      source: 'user',
    },
    select: { id: true, label: true, weight: true, position: true, source: true },
  });
  return NextResponse.json(angle, { status: 201 });
});

// ── PUT /api/app/workspace/angles — bulk update weights/labels/order ──────────

export const PUT = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProduct(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');
  if (!Array.isArray(body.angles)) throw new HttpError(400, 'invalid_body', 'angles array required.');

  const ws = await requireWorkspace(session.userId, body.product);

  // Verify all IDs belong to this workspace
  const ids = body.angles.map((a: { id: string }) => a.id);
  const existing = await prisma.workspaceAngle.findMany({ where: { workspaceId: ws.id }, select: { id: true } });
  const ownedIds = new Set(existing.map((e) => e.id));
  if (!ids.every((id: string) => ownedIds.has(id))) throw new HttpError(403, 'forbidden', 'One or more angles not found.');

  await prisma.$transaction(
    body.angles.map((a: { id: string; weight?: number; label?: string; position?: number }, i: number) =>
      prisma.workspaceAngle.update({
        where: { id: a.id },
        data: {
          ...(typeof a.weight === 'number' && { weight: Math.max(0, Math.min(100, a.weight)) }),
          ...(typeof a.label === 'string' && a.label.trim() && { label: a.label.trim().slice(0, 100) }),
          position: typeof a.position === 'number' ? a.position : i,
        },
      }),
    ),
  );

  const updated = await prisma.workspaceAngle.findMany({
    where: { workspaceId: ws.id },
    orderBy: { position: 'asc' },
    select: { id: true, label: true, weight: true, position: true, source: true },
  });
  return NextResponse.json({ angles: updated });
});
