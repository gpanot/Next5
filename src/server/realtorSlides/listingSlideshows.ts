// server-only — never import from a 'use client' file.
// "Slideshows of this home" on the listing page: one photo slideshow per kind, made in the picked theme, outside any
// Autopilot plan. Made after the response (build.ts); the page polls the list.

import type { ListingSlideshow, Workspace } from '@prisma/client';
import { after } from 'next/server';
import { prisma } from '../../lib/db';
import { getPresignedUrl } from '../../lib/r2';
import { disclosureLine, withDisclosure } from '../../lib/playbookMoment';
import { CTA_LINES } from '../../lib/realtorPlaybooks';
import { slideThemeOf, type SlideTheme } from '../../lib/slideThemes';
import { HOME_SLIDESHOW_KINDS, isHomeSlideshowKind, type HomeSlideshowKind, type ListingSlideshowDto } from '../../types/business/listingSlideshows';
import type { PlaybookSlide } from '../../types/business/campaigns';
import { createPaidItems, LISTING_SLIDESHOW_REF } from '../credits/itemCharge';
import { HttpError } from '../http';
import { getListing } from '../listings/listings';
import { buildSlideshow } from './build';

const SIGN_SECONDS = 24 * 3600;
/** A slideshow still "making" after this long died with its instance; it shows as failed so she can try again. */
const STALE_MS = 10 * 60_000;

const isStale = (row: ListingSlideshow) => row.status === 'making' && Date.now() - row.updatedAt.getTime() > STALE_MS;

const toDto = async (row: ListingSlideshow): Promise<ListingSlideshowDto> => {
  const slides = (row.slides ?? []) as PlaybookSlide[];
  const ready = row.status === 'ready';
  const urls = ready ? await Promise.all(slides.map((s) => getPresignedUrl(s.key, SIGN_SECONDS))) : [];
  return {
    id: row.id,
    kind: isHomeSlideshowKind(row.kind) ? row.kind : 'room_by_room',
    theme: slideThemeOf(row.theme),
    status: isStale(row) ? 'failed' : ready ? 'ready' : row.status === 'failed' ? 'failed' : 'making',
    error: isStale(row) ? 'This took too long. Try again.' : row.error,
    slideUrls: urls.filter((u): u is string => Boolean(u)),
    caption: row.caption,
    createdAt: row.createdAt.toISOString(),
  };
};

/** The latest slideshow of each kind for this listing. */
export const listListingSlideshows = async (ws: Workspace, listingId: string): Promise<ListingSlideshowDto[]> => {
  await getListing(ws.id, listingId);
  const rows = await prisma.listingSlideshow.findMany({ where: { workspaceId: ws.id, listingId }, orderBy: { createdAt: 'desc' }, take: 40 });
  const latest = HOME_SLIDESHOW_KINDS.map((k) => rows.find((r) => r.kind === k)).filter((r): r is ListingSlideshow => Boolean(r));
  return Promise.all(latest.map(toDto));
};

const make = async (ws: Workspace, rowId: string, listingId: string, kind: HomeSlideshowKind, theme: SlideTheme): Promise<void> => {
  try {
    const listing = await getListing(ws.id, listingId);
    const disclosure = disclosureLine(ws.agentName, ws.brokerage);
    const { slides, caption } = await buildSlideshow({
      listing, kind, theme, moment: '', ctaLine: CTA_LINES.tour.line,
      withDisclosure: (text) => withDisclosure(text, disclosure), keyOf: (i) => `listing-slideshows/${rowId}/slide-${i + 1}.jpg`,
    });
    await prisma.listingSlideshow.update({ where: { id: rowId }, data: { status: 'ready', slides: slides as object[], caption, error: null } });
  } catch (err) {
    console.error(`[listing-slideshow] ${rowId} failed:`, err);
    const message = err instanceof HttpError || err instanceof Error ? err.message : String(err);
    await prisma.listingSlideshow.update({ where: { id: rowId }, data: { status: 'failed', error: message.slice(0, 500) } });
  }
};

/** Starts one slideshow per picked kind (a kind already making is skipped), 1 credit each; they are made after the response. */
export const startListingSlideshows = async (ws: Workspace, listingId: string, kinds: HomeSlideshowKind[], theme: SlideTheme): Promise<void> => {
  const listing = await getListing(ws.id, listingId);
  if (listing.source !== 'zillow') throw new HttpError(400, 'no_gallery', 'Slideshows use the Zillow photos of this home. Import it from Zillow first.');
  const making = await prisma.listingSlideshow.findMany({ where: { listingId, status: 'making' }, select: { kind: true, updatedAt: true } });
  const busy = new Set(making.filter((m) => Date.now() - m.updatedAt.getTime() <= STALE_MS).map((m) => m.kind));
  const todo = kinds.filter((k) => !busy.has(k));
  if (todo.length === 0) return;
  // 1 credit per slideshow; a short balance creates nothing.
  const rows = await createPaidItems(ws, LISTING_SLIDESHOW_REF, (tx) =>
    Promise.all(todo.map((kind) => tx.listingSlideshow.create({ data: { workspaceId: ws.id, listingId, kind, theme } }))),
  );
  after(() => Promise.all(rows.map((r) => make(ws, r.id, listingId, r.kind as HomeSlideshowKind, theme))));
};
