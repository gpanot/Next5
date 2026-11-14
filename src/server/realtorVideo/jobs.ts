// server-only — never import from a 'use client' file.
// Brand create → "Listing videos": the picked templates (presets.ts) at the picked length, one row each.
// The request creates the rows (preparing) and answers at once; after() does the paid prep
// (tags, plan, script, voice → R2), then queues the rows for the blitz-worker, which renders them.

import { after } from 'next/server';
import type { Listing, ListingVideo, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { getPresignedUrl, uploadToR2 } from '../../lib/r2';
import { HttpError } from '../http';
import { getListing, roomsFor, type ListingWithMaterials } from '../listings/listings';
import { presignObject } from '../storage/objectStore';
import { wakeBlitzWorker } from '../labs/blitzWorkerWake';
import { createMeter } from '../metaAds/cost';
import { workspaceHasPaid } from '../slideshowCredits/paid';
import { R2_ASSETS, buildPresetProps, buildVoicedProps } from './build';
import { cleanPresetVoice, cleanVoice, planAndWrite, planAndWritePreset, type GalleryInput } from './pipeline';
import { LENGTH_META, REALTOR_PRESETS, isVideoLength, type RealtorPreset, type VideoLength } from './presets';
import type { RealtorFacts, ScriptPack } from './script';
import type { ShotPlan } from './shotPlan';
import type { ListingVideoDto } from '../../types/business/listingVideos';

/** The default pick when none is sent (the first two templates, as before 2026-11-12). */
export const LISTING_VIDEO_PRESETS: RealtorPreset[] = ['editorial', 'rate'];
export const ACTIVE_VIDEO_STATUSES = ['preparing', 'queued', 'rendering'];
const ACTIVE = ACTIVE_VIDEO_STATUSES;
const VOICE_KEY = (id: string) => `listing-videos/${id}/voice.wav`;


type Address = { city?: string | null; state?: string | null };
type Candidate = { url: string; thumbUrl: string; tag?: string | null };

export const factsOf = async (listing: Listing): Promise<RealtorFacts> => {
  const address = (listing.address ?? {}) as Address;
  if (!address.city || !address.state || !listing.priceCents) {
    throw new HttpError(400, 'listing_incomplete', listing.source === 'zillow' ? 'This home needs a city, state and price from Zillow to make a video.' : 'Add the city, state and price of this home to make a video.');
  }
  // The listing description lives on the scrape cache (blitz_listing_runs), not on the listing row.
  const run = listing.zpid ? await prisma.blitzListingRun.findFirst({ where: { zpid: listing.zpid }, orderBy: { createdAt: 'desc' } }) : null;
  const extra = (run?.facts ?? {}) as Partial<Pick<RealtorFacts, 'description' | 'street' | 'yearBuilt' | 'lotSqft' | 'homeType' | 'neighborhood' | 'highlights'>>;
  return {
    city: address.city, state: address.state, priceUsd: listing.priceCents / 100,
    beds: listing.beds ?? 0, baths: listing.baths ?? 0, sqft: listing.sqft ?? 0, status: listing.status,
    description: extra.description ?? '',
    street: extra.street ?? null, yearBuilt: extra.yearBuilt ?? null, lotSqft: extra.lotSqft ?? null,
    homeType: extra.homeType ?? null, neighborhood: extra.neighborhood ?? null,
    highlights: Array.isArray(extra.highlights) ? extra.highlights : [],
  };
};

const absolute = (url: string) => (url.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${url}` : url);

/** Uploaded homes: her own room photos, signed so the worker can fetch them. */
const uploadedGallery = async (listing: ListingWithMaterials): Promise<GalleryInput[]> => {
  const rooms = roomsFor(listing);
  const urls = await Promise.all(rooms.map((m) => presignObject(m.r2Key, 3 * 24 * 60 * 60)));
  return rooms.flatMap((m, i) => (urls[i] ? [{ url: absolute(urls[i] as string), thumbUrl: absolute(urls[i] as string), tag: m.tag }] : []));
};

const galleryOf = async (listing: ListingWithMaterials): Promise<GalleryInput[]> => {
  const photos = listing.source === 'zillow'
    ? ((listing.candidates ?? []) as Candidate[]).filter((c) => c.url && c.thumbUrl)
    : await uploadedGallery(listing);
  if (photos.length < 4) {
    throw new HttpError(400, 'listing_no_photos', listing.source === 'zillow' ? 'Import this home from Zillow first: a video needs its photo gallery.' : 'Add at least 4 photos of this home to make a video.');
  }
  return photos;
};

const fail = (ids: string[], error: unknown) =>
  prisma.listingVideo.updateMany({
    where: { id: { in: ids } },
    data: { status: 'failed', error: (error instanceof Error ? error.message : String(error)).slice(0, 1_000) },
  });

/** The length a row was asked at; it rides in props from creation (no column for it). */
export const lengthOf = (row: Pick<ListingVideo, 'props'>): VideoLength => {
  const value = (row.props as { length?: unknown } | null)?.length;
  return isVideoLength(value) ? value : 'standard';
};

/** Editorial and Rate at 25 s share one plan + script (the original writer); every other pick writes its own. */
const usesSharedScript = (preset: RealtorPreset, length: VideoLength) => (preset === 'editorial' || preset === 'rate') && length === 'standard';

type Shared = () => Promise<{ plan: ShotPlan; script: ScriptPack }>;

const prepareOne = async (row: ListingVideo, facts: RealtorFacts, gallery: GalleryInput[], shared: Shared): Promise<void> => {
  const preset = row.preset as RealtorPreset;
  const length = lengthOf(row);
  const meter = createMeter();
  const voicePath = `r2:${VOICE_KEY(row.id)}`;
  let props;
  if (usesSharedScript(preset, length)) {
    const { plan, script } = await shared();
    const narration = await cleanVoice(script, preset, meter);
    await uploadToR2(VOICE_KEY(row.id), narration.wav, 'audio/wav');
    props = buildVoicedProps({ preset, facts, plan, script, words: narration.words, voiceDurationS: narration.durationS, voicePath, assets: R2_ASSETS });
  } else {
    const { plan, script } = await planAndWritePreset(facts, gallery, preset, length);
    const narration = await cleanPresetVoice(script, preset, meter);
    await uploadToR2(VOICE_KEY(row.id), narration.wav, 'audio/wav');
    props = buildPresetProps({ preset, length, facts, plan, script, words: narration.words, voiceDurationS: narration.durationS, voicePath, assets: R2_ASSETS });
  }
  await prisma.listingVideo.update({
    where: { id: row.id },
    data: { status: 'queued', props: { ...props, length } as object, durationS: props.durationS, costUsdMicros: meter.summary().usdMicros },
  });
};

/** The paid part, run after the response: a script and a voice per row, then queue for the worker. */
export const prepareListingVideos = async (listing: ListingWithMaterials, rows: ListingVideo[]): Promise<void> => {
  try {
    const facts = await factsOf(listing);
    const gallery = await galleryOf(listing);
    let sharedRun: ReturnType<Shared> | null = null;
    const shared: Shared = () => (sharedRun ??= planAndWrite(facts, gallery));
    await Promise.all(rows.map(async (row) => {
      try {
        await prepareOne(row, facts, gallery, shared);
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

/** Picks the asked presets, defaulting to both; unknown names are dropped. */
export const parsePresets = (value: unknown): RealtorPreset[] => {
  if (!Array.isArray(value)) return LISTING_VIDEO_PRESETS;
  const picked = REALTOR_PRESETS.filter((p) => value.includes(p));
  if (picked.length === 0) throw new HttpError(400, 'no_preset', 'Pick at least one video.');
  return picked;
};

/** Workspaces that never paid only get 15 s videos. No length sent: 25 s for paid, 15 s otherwise. */
export const allowedLength = async (ws: Workspace, value: unknown): Promise<VideoLength> => {
  const paid = await workspaceHasPaid(ws.id);
  if (!paid) {
    if (isVideoLength(value) && LENGTH_META[value].paidOnly) throw new HttpError(402, 'length_paid_only', 'Longer videos come with a paid plan. The 15 s video is free.');
    return 'short';
  }
  return isVideoLength(value) ? value : 'standard';
};

/**
 * Starts the picked videos for a listing. A preset already in progress keeps its row (no double spend).
 * Returns the row of every picked preset (new or already in progress), so a campaign post can point at it.
 */
export const startListingVideos = async (
  ws: Workspace, listingId: string, presets: RealtorPreset[] = LISTING_VIDEO_PRESETS, length?: VideoLength,
): Promise<ListingVideo[]> => {
  const len = length ?? (await allowedLength(ws, undefined));
  const listing = await getListing(ws.id, listingId);
  const busy = await prisma.listingVideo.findMany({ where: { listingId, status: { in: ACTIVE } }, orderBy: { createdAt: 'desc' } });
  const todo = presets.filter((p) => !busy.some((b) => b.preset === p));
  const kept = presets.map((p) => busy.find((b) => b.preset === p)).filter((r): r is ListingVideo => Boolean(r));
  if (todo.length === 0) return kept;
  await galleryOf(listing);
  await factsOf(listing);
  const rows = await Promise.all(
    todo.map((preset) => prisma.listingVideo.create({ data: { workspaceId: ws.id, listingId, preset, props: { length: len } } })),
  );
  after(() => prepareListingVideos(listing, rows));
  return [...kept, ...rows];
};

/** The video's first photo, shown as its thumbnail so a grid never loads the videos themselves. */
const posterOf = async (props: unknown): Promise<string | null> => {
  const beats = (props as { beats?: unknown } | null)?.beats;
  const first = Array.isArray(beats) ? (beats[0] as { photo?: unknown } | undefined)?.photo : undefined;
  if (typeof first !== 'string' || first.length === 0) return null;
  return first.startsWith('r2:') ? getPresignedUrl(first.slice(3), 24 * 3600) : first;
};

export const toListingVideoDto = async (row: ListingVideo): Promise<ListingVideoDto> => {
  const ready = row.status === 'ready' && row.videoKey;
  return {
    id: row.id,
    preset: row.preset as RealtorPreset,
    length: lengthOf(row),
    status: row.status as ListingVideoDto['status'],
    error: row.status === 'failed' ? 'This video could not be made. Try again.' : null,
    durationS: row.durationS,
    videoUrl: ready ? await getPresignedUrl(row.videoKey!, 24 * 3600) : null,
    downloadUrl: ready ? await getPresignedUrl(row.videoKey!, 24 * 3600, `${row.preset}-listing-video.mp4`) : null,
    posterUrl: ready ? await posterOf(row.props) : null,
    createdAt: row.createdAt.toISOString(),
  };
};

/** Latest video per preset for this listing (older takes stay in the table). */
export const listListingVideos = async (ws: Workspace, listingId: string): Promise<ListingVideoDto[]> => {
  await getListing(ws.id, listingId);
  const rows = await prisma.listingVideo.findMany({ where: { workspaceId: ws.id, listingId }, orderBy: { createdAt: 'desc' }, take: 40 });
  const latest = REALTOR_PRESETS.map((p) => rows.find((r) => r.preset === p)).filter((r): r is ListingVideo => Boolean(r));
  if (latest.some((r) => r.status === 'queued')) wakeBlitzWorker({ throttle: true });
  return Promise.all(latest.map(toListingVideoDto));
};
