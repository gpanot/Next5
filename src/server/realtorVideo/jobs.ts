// server-only — never import from a 'use client' file.
// Brand create → "Listing videos": one Editorial + one "Rate this house" video per click.
// The request creates two rows (preparing) and answers at once; after() does the paid prep
// (tags, plan, script, voice → R2), then queues the rows for the blitz-worker, which renders them.

import { after } from 'next/server';
import type { Listing, ListingVideo, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { getPresignedUrl, uploadToR2 } from '../../lib/r2';
import { HttpError } from '../http';
import { getListing } from '../listings/listings';
import { wakeBlitzWorker } from '../labs/blitzWorkerWake';
import { createMeter } from '../metaAds/cost';
import { R2_ASSETS, buildVoicedProps, type RealtorPreset } from './build';
import { cleanVoice, planAndWrite, type GalleryInput } from './pipeline';
import type { RealtorFacts } from './script';
import type { ListingVideoDto } from '../../types/business/listingVideos';

export const LISTING_VIDEO_PRESETS: RealtorPreset[] = ['editorial', 'rate'];
const ACTIVE = ['preparing', 'queued', 'rendering'];
const VOICE_KEY = (id: string) => `listing-videos/${id}/voice.wav`;


type Address = { city?: string | null; state?: string | null };
type Candidate = { url: string; thumbUrl: string; tag?: string | null };

const factsOf = async (listing: Listing): Promise<RealtorFacts> => {
  const address = (listing.address ?? {}) as Address;
  if (!address.city || !address.state || !listing.priceCents) {
    throw new HttpError(400, 'listing_incomplete', 'This home needs a city, state and price from Zillow to make a video.');
  }
  // The listing description lives on the scrape cache (blitz_listing_runs), not on the listing row.
  const run = listing.zpid ? await prisma.blitzListingRun.findFirst({ where: { zpid: listing.zpid }, orderBy: { createdAt: 'desc' } }) : null;
  const description = ((run?.facts ?? {}) as { description?: string | null }).description ?? '';
  return {
    city: address.city, state: address.state, priceUsd: listing.priceCents / 100,
    beds: listing.beds ?? 0, baths: listing.baths ?? 0, sqft: listing.sqft ?? 0, status: listing.status, description,
  };
};

const galleryOf = (listing: Listing): GalleryInput[] => {
  const photos = ((listing.candidates ?? []) as Candidate[]).filter((c) => c.url && c.thumbUrl);
  if (photos.length < 4) throw new HttpError(400, 'listing_no_photos', 'Import this home from Zillow first: a video needs its photo gallery.');
  return photos;
};

const fail = (ids: string[], error: unknown) =>
  prisma.listingVideo.updateMany({
    where: { id: { in: ids } },
    data: { status: 'failed', error: (error instanceof Error ? error.message : String(error)).slice(0, 1_000) },
  });

/** The paid part, run after the response: one plan + script, then a voice per preset, then queue for the worker. */
export const prepareListingVideos = async (listing: Listing, rows: ListingVideo[]): Promise<void> => {
  try {
    const facts = await factsOf(listing);
    const { plan, script } = await planAndWrite(facts, galleryOf(listing));
    await Promise.all(rows.map(async (row) => {
      const preset = row.preset as RealtorPreset;
      const meter = createMeter();
      try {
        const narration = await cleanVoice(script, preset, meter);
        await uploadToR2(VOICE_KEY(row.id), narration.wav, 'audio/wav');
        const props = buildVoicedProps({
          preset, facts, plan, script, words: narration.words, voiceDurationS: narration.durationS,
          voicePath: `r2:${VOICE_KEY(row.id)}`, assets: R2_ASSETS,
        });
        await prisma.listingVideo.update({
          where: { id: row.id },
          data: { status: 'queued', props: props as object, durationS: props.durationS, costUsdMicros: meter.summary().usdMicros },
        });
      } catch (err) {
        console.error(`[realtor-video] ${row.id} prep failed:`, err);
        await fail([row.id], err);
      }
    }));
    wakeBlitzWorker();
  } catch (err) {
    console.error('[realtor-video] prep failed:', err);
    await fail(rows.map((r) => r.id), err);
  }
};

/** Starts both videos for a listing. A listing already in progress keeps its rows (no double spend). */
export const startListingVideos = async (ws: Workspace, listingId: string): Promise<void> => {
  const listing = await getListing(ws.id, listingId);
  const busy = await prisma.listingVideo.count({ where: { listingId, status: { in: ACTIVE } } });
  if (busy > 0) return;
  galleryOf(listing);
  await factsOf(listing);
  const rows = await Promise.all(
    LISTING_VIDEO_PRESETS.map((preset) => prisma.listingVideo.create({ data: { workspaceId: ws.id, listingId, preset } })),
  );
  after(() => prepareListingVideos(listing, rows));
};

const toDto = async (row: ListingVideo): Promise<ListingVideoDto> => {
  const ready = row.status === 'ready' && row.videoKey;
  return {
    id: row.id,
    preset: row.preset as RealtorPreset,
    status: row.status as ListingVideoDto['status'],
    error: row.status === 'failed' ? 'This video could not be made. Try again.' : null,
    durationS: row.durationS,
    videoUrl: ready ? await getPresignedUrl(row.videoKey!, 24 * 3600) : null,
    downloadUrl: ready ? await getPresignedUrl(row.videoKey!, 24 * 3600, `${row.preset}-listing-video.mp4`) : null,
    createdAt: row.createdAt.toISOString(),
  };
};

/** Latest video per preset for this listing (older takes stay in the table). */
export const listListingVideos = async (ws: Workspace, listingId: string): Promise<ListingVideoDto[]> => {
  await getListing(ws.id, listingId);
  const rows = await prisma.listingVideo.findMany({ where: { workspaceId: ws.id, listingId }, orderBy: { createdAt: 'desc' }, take: 20 });
  const latest = LISTING_VIDEO_PRESETS.map((p) => rows.find((r) => r.preset === p)).filter((r): r is ListingVideo => Boolean(r));
  if (latest.some((r) => r.status === 'queued')) wakeBlitzWorker({ throttle: true });
  return Promise.all(latest.map(toDto));
};
