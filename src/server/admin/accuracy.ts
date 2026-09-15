// server-only — never import from a 'use client' file.

import { prisma } from '../../lib/db';

export const ACCURACY_GATE = 0.8;

export type ShopAccuracy = { photos: number; firstTry: number; rate: number | null; byCategory: { category: string; photos: number; rate: number }[]; passesGate: boolean };

/**
 * First-try accuracy for Shop photos: the share of finished product photos the seller never redid as
 * "doesn't match product". The paid Shop launch is gated on ≥ 80% (research threshold, P16).
 */
export const shopAccuracy = async (from: Date): Promise<ShopAccuracy> => {
  const items = await prisma.batchItem.findMany({
    where: { productId: { not: null }, status: 'ready', createdAt: { gte: from } },
    select: { redoReason: true, product: { select: { category: true } } },
  });
  const mismatch = (reason: string | null) => Boolean(reason?.startsWith('product_mismatch'));
  const groups = new Map<string, { photos: number; ok: number }>();
  for (const i of items) {
    const g = groups.get(i.product?.category ?? 'other') ?? { photos: 0, ok: 0 };
    g.photos += 1;
    if (!mismatch(i.redoReason)) g.ok += 1;
    groups.set(i.product?.category ?? 'other', g);
  }
  const firstTry = items.filter((i) => !mismatch(i.redoReason)).length;
  const rate = items.length ? firstTry / items.length : null;
  return {
    photos: items.length,
    firstTry,
    rate,
    byCategory: [...groups].map(([category, g]) => ({ category, photos: g.photos, rate: g.ok / g.photos })).sort((a, b) => b.photos - a.photos),
    passesGate: rate !== null && rate >= ACCURACY_GATE && items.length >= 30,
  };
};
