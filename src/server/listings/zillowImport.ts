// server-only — never import from a 'use client' file.
// Zillow import: she pastes a link and says she represents the home → run → every gallery photo becomes a
// photo of the property → she removes the ones she doesn't want. Plan: docs/business-studios/13-zillow-import-plan.md.
// Listing mode rules (12-listing-mode-plan.md) are unchanged: photos only ever come from the real home.

import { Prisma, type Listing, type Workspace } from '@prisma/client';
import sharp from 'sharp';
import { parseZillowUrl, tagLabel } from '../../lib/listingPhotos';
import { prisma } from '../../lib/db';
import { apifyWebhookUrl } from '../apify/client';
import { HttpError } from '../http';
import { materialKey } from '../storage/keys';
import { putObject } from '../storage/objectStore';
import { MAX_ROOMS_PER_LISTING, brandOnly } from './listings';
import { mapLimit } from './mapLimit';
import { tagPhotos } from './photoTags';
import { getZillowRows, getZillowRun, startZillowRun } from './zillowApify';
import { labelFromUrl, normalizeZillowRow, type ZillowCandidate } from './zillowNormalize';

const INGESTING = 'ingesting:';
const STALE_INGEST_MS = 5 * 60_000;
const NO_PHOTOS = 'Zillow has no photos for this home. Upload your photos instead.';

export const candidatesOf = (listing: Pick<Listing, 'candidates'>): ZillowCandidate[] =>
  Array.isArray(listing.candidates) ? (listing.candidates as unknown as ZillowCandidate[]) : [];

/** One of her Zillow properties, in any import state. */
export const getImport = async (workspaceId: string, listingId: string): Promise<Listing> => {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, workspaceId, source: 'zillow' } });
  if (!listing) throw new HttpError(404, 'listing_not_found', 'That property is no longer here. Paste the link again.');
  return listing;
};

const startRun = async (listing: Listing, url: string, zpid: string, data: Prisma.ListingUpdateInput): Promise<Listing> => {
  try {
    const { runId } = await startZillowRun(url, zpid, apifyWebhookUrl());
    return await prisma.listing.update({ where: { id: listing.id }, data: { ...data, runId, importError: null } });
  } catch (err) {
    if (listing.importStatus !== 'ready') await prisma.listing.update({ where: { id: listing.id }, data: { ...data, importStatus: 'failed', importError: 'We could not reach Zillow. Try again.' } });
    throw err;
  }
};

/**
 * "Add property" with a Zillow link: she confirms she represents the home (a self-declaration), the property
 * appears at once in `fetching`, and its photos arrive when the run finishes. The same home again returns it.
 */
export const startZillowImport = async (ws: Workspace, rawUrl: string, attest: boolean): Promise<Listing> => {
  brandOnly(ws);
  const link = parseZillowUrl(rawUrl);
  if (!link) throw new HttpError(400, 'invalid_zillow_url', 'Open the home on Zillow, then copy that link.');
  if (!attest) throw new HttpError(400, 'attest_required', 'Confirm you represent this property.');

  const existing = await prisma.listing.findUnique({ where: { workspaceId_zpid: { workspaceId: ws.id, zpid: link.zpid } } });
  if (existing && !existing.archivedAt && (existing.importStatus === 'ready' || (existing.importStatus === 'fetching' && existing.runId))) return existing;
  const again = { archivedAt: null, attestedAt: new Date(), sourceUrl: link.url };
  if (existing?.importStatus === 'ready') return startRun(existing, link.url, link.zpid, again);
  if (existing) return startRun(existing, link.url, link.zpid, { ...again, importStatus: 'fetching' });

  let listing: Listing;
  try {
    listing = await prisma.listing.create({
      data: { workspaceId: ws.id, label: labelFromUrl(link.url), source: 'zillow', zpid: link.zpid, sourceUrl: link.url, importStatus: 'fetching', attestedAt: new Date() },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
    return prisma.listing.findUniqueOrThrow({ where: { workspaceId_zpid: { workspaceId: ws.id, zpid: link.zpid } } });
  }
  return startRun(listing, link.url, link.zpid, {});
};

/** Downloads one gallery photo as a photo of the property. False when Zillow does not serve it or it can't be read. */
const importPhoto = async (ws: Workspace, listingId: string, candidate: ZillowCandidate, createdAt: Date): Promise<boolean> => {
  try {
    const res = await fetch(candidate.url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return false;
    const image = sharp(Buffer.from(await res.arrayBuffer()), { failOn: 'error' });
    const meta = await image.metadata();
    const jpeg = await image.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    const material = await prisma.postMaterial.create({
      data: {
        workspaceId: ws.id, listingId, r2Key: 'pending', kind: 'listing', label: tagLabel(candidate.tag),
        sourceUrl: candidate.url, width: meta.width ?? null, height: meta.height ?? null, tag: candidate.tag, createdAt,
      },
    });
    const key = materialKey(ws.id, material.id);
    await putObject(key, jpeg);
    await prisma.postMaterial.update({ where: { id: material.id }, data: { r2Key: key } });
    return true;
  } catch (err) {
    console.error('[zillowImport] photo', candidate.id, err instanceof Error ? err.message : err);
    return false;
  }
};

/** Downloads photos in gallery order; a millisecond apart per photo keeps that order on the property. */
const importPhotos = async (ws: Workspace, listingId: string, photos: ZillowCandidate[]): Promise<number> => {
  const base = Date.now();
  const results = await mapLimit(photos.map((c, i) => ({ c, i })), 6, ({ c, i }) => importPhoto(ws, listingId, c, new Date(base + i)));
  return results.filter(Boolean).length;
};

const failRun = (listing: Listing, message: string) =>
  prisma.listing.update({
    where: { id: listing.id },
    // A failed refresh keeps a ready property usable; only a first import is marked failed.
    data: { runId: null, importError: message.slice(0, 300), ...(listing.importStatus === 'ready' ? {} : { importStatus: 'failed' }) },
  });

/** Tags only photos we have not seen before (the label goes into the prompt: "a real property (Kitchen)"). */
const tagCandidates = async (fresh: ZillowCandidate[], previous: ZillowCandidate[]): Promise<ZillowCandidate[]> => {
  const known = new Map(previous.map((c) => [c.id, c]));
  const merged = fresh.map((c) => ({ ...c, tag: known.get(c.id)?.tag ?? null }));
  const unknown = merged.filter((c) => !known.has(c.id));
  const tags = await tagPhotos(unknown.map((c) => c.thumbUrl));
  unknown.forEach((c, i) => (c.tag = tags[i] ?? null));
  return merged;
};

const ingest = async (listing: Listing, datasetId: string, now: Date): Promise<void> => {
  const data = normalizeZillowRow((await getZillowRows(datasetId))[0]);
  if (!data || data.candidates.length === 0) {
    await failRun(listing, NO_PHOTOS);
    return;
  }
  const candidates = await tagCandidates(data.candidates, candidatesOf(listing));
  const first = listing.importStatus !== 'ready';
  if (first) {
    const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: listing.workspaceId } });
    const have = await prisma.postMaterial.findMany({ where: { listingId: listing.id, archivedAt: null }, select: { sourceUrl: true } });
    const urls = new Set(have.map((m) => m.sourceUrl));
    const saved = await importPhotos(ws, listing.id, candidates.filter((c) => !urls.has(c.url)).slice(0, MAX_ROOMS_PER_LISTING - have.length));
    if (saved + have.length === 0) {
      await failRun(listing, 'We could not download the photos from Zillow. Try again, or upload your photos.');
      return;
    }
  }
  // A refresh never adds photos: she already cleaned them up. New ones show as "more on Zillow".
  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...(first ? { importStatus: 'ready', label: (data.address?.street ?? listing.label).slice(0, 120), importedAt: now } : {}),
      address: data.address ?? Prisma.DbNull, priceCents: data.priceCents, beds: data.beds, baths: data.baths, sqft: data.sqft,
      status: data.status, daysOnMarket: data.daysOnMarket, candidates: candidates as unknown as Prisma.InputJsonValue,
      runId: null, importError: null, syncedAt: now,
    },
  });
};

/** Poll fallback and webhook handler: when the run finished, store the home and its photos. Safe to call repeatedly. */
export const refreshZillowImport = async (listing: Listing, now = new Date()): Promise<Listing> => {
  const runId = listing.runId;
  if (!runId) return listing;
  if (runId.startsWith(INGESTING)) {
    if (now.getTime() - listing.updatedAt.getTime() < STALE_INGEST_MS) return listing;
    await failRun(listing, 'Getting the photos took too long. Try again.');
    return prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
  }
  const run = await getZillowRun(runId);
  if (run.status === 'running') return listing;
  if (run.status === 'failed' || !run.datasetId) {
    await failRun(listing, 'We could not get this home from Zillow. Try again, or upload your photos.');
  } else {
    // Claim the run so a webhook and a poll can't ingest it twice.
    const claimed = await prisma.listing.updateMany({ where: { id: listing.id, runId }, data: { runId: `${INGESTING}${runId}` } });
    if (claimed.count > 0) {
      await ingest(listing, run.datasetId, now).catch((err: unknown) => {
        console.error('[zillowImport] ingest', listing.id, err instanceof Error ? err.message : err);
        return failRun(listing, 'We could not read this home from Zillow. Try again, or upload your photos.');
      });
    }
  }
  return prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
};

/** "More on Zillow": adds back gallery photos she removed, or new ones a refresh found. */
export const addZillowPhotos = async (ws: Workspace, listingId: string, photoIds: string[]): Promise<Listing> => {
  brandOnly(ws);
  const listing = await getImport(ws.id, listingId);
  if (listing.importStatus !== 'ready') throw new HttpError(409, 'import_not_ready', 'This home is still loading from Zillow.');
  const existing = await prisma.postMaterial.findMany({ where: { listingId: listing.id, archivedAt: null }, select: { sourceUrl: true } });
  const have = new Set(existing.map((m) => m.sourceUrl));
  const wanted = new Set(photoIds);
  const picks = candidatesOf(listing).filter((c) => wanted.has(c.id) && !have.has(c.url));
  const room = MAX_ROOMS_PER_LISTING - existing.length;
  if (picks.length === 0) throw new HttpError(400, 'no_photos', 'Pick at least one photo.');
  if (picks.length > room) throw new HttpError(400, 'too_many_rooms', `A property can hold up to ${MAX_ROOMS_PER_LISTING} photos. Pick ${Math.max(room, 0)} or fewer.`);
  if ((await importPhotos(ws, listing.id, picks)) === 0) throw new HttpError(502, 'photos_failed', 'We could not download those photos from Zillow. Try again, or upload them.');
  return listing;
};

/** "Refresh from Zillow": status, price and the gallery. Her photos and settings stay. */
export const startZillowSync = async (ws: Workspace, listingId: string): Promise<Listing> => {
  brandOnly(ws);
  const listing = await getImport(ws.id, listingId);
  if (listing.runId) return listing;
  if (listing.importStatus !== 'ready' || !listing.sourceUrl || !listing.zpid) throw new HttpError(409, 'sync_unavailable', 'Wait for the photos to finish loading first.');
  return startRun(listing, listing.sourceUrl, listing.zpid, {});
};
