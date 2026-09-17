// server-only — never import from a 'use client' file.

import JSZip from 'jszip';
import { FORMATS, isFormatId } from '../../config/formats';
import { prisma } from '../../lib/db';
import { getObject } from '../storage/objectStore';

export const MAX_ZIP_FILES = 200;

const slug = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';

const suffix = (format: string): string => (isFormatId(format) ? FORMATS[format].filenameSuffix : format);

/** Unique, readable file names: shop `SKU_shot_1x1.jpg`, brand `theme_scene_4x5.jpg`. */
export const buildFileNames = (
  items: readonly { sceneId: string | null; shot: string | null; format: string; productLabel: string | null; themeId: string | null }[],
): string[] => {
  const used = new Map<string, number>();
  return items.map((item) => {
    const stem = item.productLabel
      ? `${item.productLabel}_${item.shot ?? 'photo'}_${suffix(item.format)}`
      : `${slug(item.themeId ?? 'photo')}_${slug(item.sceneId ?? 'scene')}_${suffix(item.format)}`;
    const n = (used.get(stem) ?? 0) + 1;
    used.set(stem, n);
    return `${stem}${n > 1 ? `-${n}` : ''}.jpg`;
  });
};

/** Zips ready items of a batch (optionally one product / format). Returns null when nothing is ready. */
export const zipBatch = async (
  batchId: string,
  filter: { productId?: string | null; format?: string | null },
): Promise<{ buffer: Buffer; count: number; name: string } | null> => {
  const batch = await prisma.batch.findUniqueOrThrow({ where: { id: batchId }, select: { name: true, themeId: true } });
  const items = await prisma.batchItem.findMany({
    where: {
      batchId,
      status: 'ready',
      r2Key: { not: null },
      archivedAt: null,
      ...(filter.productId ? { productId: filter.productId } : {}),
      ...(filter.format ? { format: filter.format } : {}),
    },
    include: { product: { select: { sku: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    take: MAX_ZIP_FILES,
  });
  if (items.length === 0) return null;

  const names = buildFileNames(items.map((i) => ({
    sceneId: i.sceneId, shot: i.shot, format: i.format, themeId: batch.themeId,
    productLabel: i.product ? (i.product.sku?.trim() || slug(i.product.name)) : null,
  })));
  const zip = new JSZip();
  await Promise.all(items.map(async (item, index) => {
    const body = item.r2Key ? await getObject(item.r2Key) : null;
    if (body) zip.file(names[index] ?? `${item.id}.jpg`, body);
  }));
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  return { buffer, count: items.length, name: `${slug(batch.name)}.zip` };
};
