// server-only — never import from a 'use client' file.
// What a Prospect Pack's link shows when it is pasted in a chat (/p/<token> share card): the business name, how many
// days of posts, and the first slides of its first slideshows as small inline JPEGs.

import sharp from 'sharp';
import { prisma } from '../../lib/db';
import { getObjectBuffer } from '../../lib/r2';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import type { ProspectDay } from '../../types/admin/prospects';

export type ProspectShareCard = { name: string; websiteUrl: string; days: number; covers: string[] };

const COVER_COUNT = 3;

/** One slide as a small JPEG data URL (the card renderer cannot read every format, and inline keeps it fast). */
const coverOf = async (key: string): Promise<string | null> => {
  const buf = await getObjectBuffer(key).catch(() => null);
  if (!buf) return null;
  const jpg = await sharp(buf).resize(300, 375, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString('base64')}`;
};

/** First-slide keys of the pack's slideshows, in posting order. */
const firstSlideKeys = async (days: ProspectDay[]): Promise<string[]> => {
  const ids = days.filter((d) => d.kind !== 'blitz').map((d) => d.refId);
  const shows = await prisma.autoSlideshow.findMany({ where: { id: { in: ids } }, select: { id: true, slides: true } });
  const keyOf = new Map(shows.map((s) => [s.id, ((s.slides as unknown as AutoSlide[]) ?? [])[0]?.imageKey]));
  return ids.map((id) => keyOf.get(id)).filter((k): k is string => !!k);
};

/** The card's data, or null for a wrong token or a pack that is not ready (same rule as the review page). */
export const prospectShareCard = async (token: string, withCovers: boolean): Promise<ProspectShareCard | null> => {
  const pack = await prisma.prospectPack.findUnique({ where: { shareToken: token }, select: { name: true, websiteUrl: true, status: true, days: true } });
  if (!pack || (pack.status !== 'ready' && pack.status !== 'claimed')) return null;
  const days = (pack.days as unknown as ProspectDay[]) ?? [];
  if (!withCovers) return { name: pack.name, websiteUrl: pack.websiteUrl, days: days.length, covers: [] };
  const keys = (await firstSlideKeys(days)).slice(0, COVER_COUNT + 2);
  const covers = (await Promise.all(keys.map((k) => coverOf(k).catch(() => null)))).filter((c): c is string => !!c);
  return { name: pack.name, websiteUrl: pack.websiteUrl, days: days.length, covers: covers.slice(0, COVER_COUNT) };
};
