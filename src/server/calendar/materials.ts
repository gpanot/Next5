// server-only — never import from a 'use client' file.
// The drop box: her listings and rooms. We put her into them, so the calendar holds her real
// business instead of generic backdrops. Plan: docs/business-studios/11-calendar-plan.md §2.3.

import type { PostMaterial, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { materialKey } from '../storage/keys';
import { deleteObject, presignObject, putObject } from '../storage/objectStore';

/** `result` (before/after) is deliberately absent: it carries a compliance edge we are not taking on (§5.7). */
export const MATERIAL_KINDS = ['listing', 'room', 'other'] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const MAX_MATERIALS_PER_UPLOAD = 20;

export const isMaterialKind = (value: unknown): value is MaterialKind => MATERIAL_KINDS.includes(value as MaterialKind);

const brandOnly = (ws: Workspace): void => {
  if (ws.product !== 'brand') throw new HttpError(400, 'wrong_product', 'The drop box is part of Brand Studio.');
};

export const listMaterials = async (workspaceId: string): Promise<PostMaterial[]> =>
  prisma.postMaterial.findMany({ where: { workspaceId, archivedAt: null }, orderBy: { createdAt: 'desc' }, take: 60 });

export const toMaterialDto = async (m: PostMaterial) => ({
  id: m.id,
  kind: m.kind as MaterialKind,
  label: m.label,
  url: m.r2Key === 'pending' ? null : await presignObject(m.r2Key),
  used: m.usedAt !== null,
  createdAt: m.createdAt.toISOString(),
});

/** Stores one uploaded photo. The row is created first so the key is built from a server id. */
export const addMaterial = async (
  ws: Workspace,
  image: Buffer,
  input: { kind: MaterialKind; label: string | null },
): Promise<PostMaterial> => {
  brandOnly(ws);
  const material = await prisma.postMaterial.create({
    data: { workspaceId: ws.id, r2Key: 'pending', kind: input.kind, label: input.label?.slice(0, 120) || null },
  });
  const key = materialKey(ws.id, material.id);
  await putObject(key, image);
  return prisma.postMaterial.update({ where: { id: material.id }, data: { r2Key: key } });
};

export const archiveMaterial = async (workspaceId: string, materialId: string): Promise<void> => {
  const material = await prisma.postMaterial.findFirst({ where: { id: materialId, workspaceId, archivedAt: null } });
  if (!material) throw new HttpError(404, 'material_not_found', 'That photo is no longer in your drop box.');
  await prisma.postMaterial.update({ where: { id: material.id }, data: { archivedAt: new Date() } });
  if (material.r2Key !== 'pending') await deleteObject(material.r2Key).catch(() => undefined);
};

/** The next material waiting to be photographed — oldest first, so nothing she uploaded is forgotten. */
export const nextUnusedMaterials = async (workspaceId: string, count: number): Promise<PostMaterial[]> =>
  prisma.postMaterial.findMany({
    where: { workspaceId, archivedAt: null, usedAt: null, r2Key: { not: 'pending' } },
    orderBy: { createdAt: 'asc' },
    take: Math.max(0, count),
  });

export const markMaterialsUsed = async (ids: string[], now = new Date()): Promise<void> => {
  if (ids.length === 0) return;
  await prisma.postMaterial.updateMany({ where: { id: { in: ids } }, data: { usedAt: now } });
};

export const countUnused = async (workspaceId: string): Promise<number> =>
  prisma.postMaterial.count({ where: { workspaceId, archivedAt: null, usedAt: null } });
