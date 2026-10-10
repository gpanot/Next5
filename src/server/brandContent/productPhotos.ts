// server-only — never import from a 'use client' file.
// The brand's own photos as the slideshow photo plan reads them (photoPlan.ts): described photos only, with what the
// vision model said about them (describePhoto.ts). Photos described before version 2 get safe defaults: reference only.

import { prisma } from '../../lib/db';

export type BrandPhotoFacts = {
  id: string;
  r2Key: string;
  description: string;
  /** product_only | product_on_person | product_in_use | screen_ui | lifestyle | place | person | team | other */
  photoType: string;
  productName: string;
  looksLikeAd: boolean;
  usableAsBackground: boolean;
  usableAsReference: boolean;
};

/** The photo plan never sees more than this many photos: enough to choose from, small enough for one prompt. */
const MAX_PHOTOS = 24;

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** The workspace's described photos, newest first. */
export const brandPhotoFacts = async (workspaceId: string): Promise<BrandPhotoFacts[]> => {
  const rows = await prisma.userUpload.findMany({
    where: { workspaceId, kind: 'photo', archivedAt: null, describeStatus: 'done' },
    orderBy: { createdAt: 'desc' },
    take: MAX_PHOTOS,
    select: { id: true, r2Key: true, description: true, descriptor: true },
  });
  return rows.map((r) => {
    const d = (r.descriptor ?? {}) as Record<string, unknown>;
    const versioned = Number(d.version ?? 1) >= 2;
    return {
      id: r.id,
      r2Key: r.r2Key,
      description: r.description ?? '',
      photoType: text(d.photo_type) || (d.shows_product === true ? 'product_on_person' : 'other'),
      productName: text(d.product_name),
      looksLikeAd: bool(d.looks_like_ad, true),
      usableAsBackground: versioned && bool(d.usable_as_background, false),
      usableAsReference: bool(d.usable_as_reference, d.shows_product === true),
    };
  });
};

/** What the brand's products look like, from its photos, for the content writers (one line per product, no repeats). */
export const productLooks = (photos: BrandPhotoFacts[]): string[] =>
  [...new Set(photos.filter((p) => p.productName && p.photoType !== 'screen_ui').map((p) => p.productName.toLowerCase()))].slice(0, 8);
