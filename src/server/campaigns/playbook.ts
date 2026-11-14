// server-only — never import from a 'use client' file.
// Realtor Autopilot: a playbook campaign (Just listed, Open house, Price drop, Just sold, Market update, Evergreen),
// placed on the free days of her calendar. Plan: docs/business-studios/15-realtor-autopilot-plan.md.

import type { Listing, Prisma, Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import { getPresignedUrl } from '../../lib/r2';
import { parseMarketArea } from '../../lib/marketArea';
import { areaForBeat, beatKeysFor, parseMarketPlaces, placeName, type MarketPlaces } from '../../lib/marketPlaces';
import { disclosureLine, eventDay, eventHours, priceLabel } from '../../lib/playbookMoment';
import { fillIdea, PLAYBOOKS, type PlaceFill, type Playbook, type PlaybookId } from '../../lib/realtorPlaybooks';
import type { PlaybookSlide, PostMediaDto } from '../../types/business/campaigns';
import { refundFailedPostsQuietly } from '../credits/ledger';
import { getActivePlan } from '../generation/createBatch';
import { HttpError } from '../http';
import { getListing } from '../listings/listings';
import { getCampaign } from './campaigns';
import { hasBrandFace } from '../realtorSlides/tips';
import type { CampaignDto } from './dto';
import { dayIndexOf, placePlaybook, type Placed } from './playbookPlan';

const MIN_PHOTOS = 4;
const SIGN_SECONDS = 24 * 3600;

type Address = { street?: string | null; city?: string | null; state?: string | null; full?: string | null };

export const placeOf = (address: unknown): { street: string; city: string } => {
  const a = (address ?? {}) as Address;
  return { street: a.street ?? a.full?.split(',')[0] ?? '', city: a.city ?? '' };
};

/** Open house time as typed or from Zillow: wall-clock "YYYY-MM-DDTHH:mm" (stored as UTC, shown as typed). */
export type EventInput = { start: string; end: string | null; source: 'zillow' | 'typed' };

export type PlaybookInput = {
  playbook: PlaybookId;
  listingId: string | null;
  startDate: string;
  channels: string[];
  event?: EventInput | null;
  /** Price drop, whole dollars. The old price defaults to the listing's price. */
  newPriceUsd?: number | null;
  oldPriceUsd?: number | null;
  /** Market update: the day she picked for each place, cities then the state. Missing or invalid → placed from startDate. */
  placeDates?: string[] | null;
  /** Other moments: the days she picked on the Dates step, a day can repeat. Missing or invalid → placed from startDate. */
  postDates?: string[] | null;
};

const CHANNELS = ['instagram', 'tiktok'];
const WALL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const wallDate = (value: string) => new Date(`${value}:00.000Z`);

type Source = { listing: Listing | null; place: PlaceFill; hasArea: boolean; places: MarketPlaces | null };

const requireDisclosure = (ws: Workspace) => {
  if (!disclosureLine(ws.agentName, ws.brokerage)) throw new HttpError(400, 'no_disclosure', 'Add your name and brokerage first: listing posts must say who lists the home.');
};

/** What the plan is made from: a Zillow listing (photos + address), her market area, or nothing (Evergreen). */
const sourceOf = async (ws: Workspace, playbook: Playbook, listingId: string | null): Promise<Source> => {
  if (playbook.paidOnly && !(await getActivePlan(ws.id))) throw new HttpError(402, 'plan_required', `${playbook.name} is on paid plans.`);
  const area = parseMarketArea(ws.marketArea);
  if (playbook.needsArea) {
    const places = parseMarketPlaces(ws.marketArea);
    if (!places) throw new HttpError(400, 'no_market_area', 'Tell us where you sell first.');
    return { listing: null, place: { street: '', city: area?.city ?? '' }, hasArea: true, places };
  }
  if (!playbook.needsListing) return { listing: null, place: { street: '', city: area?.city ?? '' }, hasArea: Boolean(area), places: null };
  if (!listingId) throw new HttpError(400, 'no_listing', 'Pick a home.');
  requireDisclosure(ws);
  const listing = await getListing(ws.id, listingId);
  const photos = Array.isArray(listing.candidates) ? listing.candidates.length : 0;
  if (photos < MIN_PHOTOS) throw new HttpError(400, 'listing_no_photos', 'Import this home from Zillow first: the posts need its photos.');
  return { listing, place: placeOf(listing.address), hasArea: Boolean(area), places: null };
};

type MomentData = { eventAt: Date | null; eventEndAt: Date | null; eventSource: string | null; newPriceCents: number | null; oldPriceCents: number | null };

/** Checks the moment's facts (open house time, new price) and applies them to the listing where they belong. */
const momentOf = async (playbook: Playbook, input: PlaybookInput, listing: Listing | null): Promise<MomentData> => {
  const none: MomentData = { eventAt: null, eventEndAt: null, eventSource: null, newPriceCents: null, oldPriceCents: null };
  if (playbook.id === 'open_house') {
    const e = input.event;
    if (!e || !WALL_TIME.test(e.start)) throw new HttpError(400, 'no_event', 'Pick the open house day and start time.');
    const end = e.end && WALL_TIME.test(e.end) && e.end > e.start ? wallDate(e.end) : null;
    return { ...none, eventAt: wallDate(e.start), eventEndAt: end, eventSource: e.source === 'zillow' ? 'zillow' : 'typed' };
  }
  if (playbook.id === 'price_drop' && listing) {
    const next = Math.round(Number(input.newPriceUsd) * 100);
    if (!(next > 0)) throw new HttpError(400, 'no_price', 'Type the new price.');
    const old = input.oldPriceUsd ? Math.round(Number(input.oldPriceUsd) * 100) : listing.priceCents;
    // The listing videos read the price from the listing: the new price must be there before they are made.
    if (listing.priceCents !== next) await prisma.listing.update({ where: { id: listing.id }, data: { priceCents: next } });
    return { ...none, newPriceCents: next, oldPriceCents: old && old > next ? old : null };
  }
  if (playbook.id === 'just_sold' && listing && listing.status !== 'sold') await prisma.listing.update({ where: { id: listing.id }, data: { status: 'sold' } });
  return none;
};

const fillOf = (place: PlaceFill, m: MomentData): PlaceFill => ({
  ...place,
  when: m.eventAt ? eventDay(m.eventAt) : undefined,
  hours: m.eventAt ? eventHours(m.eventAt, m.eventEndAt) : undefined,
  price: priceLabel(m.newPriceCents) || undefined,
  oldPrice: priceLabel(m.oldPriceCents) || undefined,
});

/** Market update: only the beats of the places she kept (up to 3 cities + 1 state). */
const withPlaces = (playbook: Playbook, places: MarketPlaces | null): Playbook => {
  if (!places) return playbook;
  const keys = beatKeysFor(places);
  return { ...playbook, beats: playbook.beats.filter((b) => keys.includes(b.key)) };
};

/** Each market update card names its own place. */
const cityFill = (fill: PlaceFill, places: MarketPlaces | null, beatKey: string): PlaceFill => {
  const area = places ? areaForBeat(places, beatKey) : null;
  return area ? { ...fill, city: placeName(area) } : fill;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Market update days she saw on Step 1 (one per beat, not past), earliest first; null when they do not fit the beats. */
const pickedDays = (playbook: Playbook, dates: string[] | null | undefined, today: string): Placed[] | null => {
  if (!dates || dates.length !== playbook.beats.length || !dates.every((d) => ISO_DAY.test(d) && d >= today)) return null;
  return playbook.beats.map((beat, i) => ({ beat, date: dates[i]! })).sort((a, b) => a.date.localeCompare(b.date));
};

/** Creates the campaign and its plan in one go. Costs nothing; nothing is made until she approves. */
export const createPlaybookCampaign = async (ws: Workspace, input: PlaybookInput): Promise<CampaignDto> => {
  const playbook = PLAYBOOKS[input.playbook];
  const channels = input.channels.filter((c) => CHANNELS.includes(c));
  if (channels.length === 0) throw new HttpError(400, 'no_channels', 'Pick at least one channel.');
  const source = await sourceOf(ws, playbook, input.listingId);
  const { listing, place, hasArea } = source;
  const moment = await momentOf(playbook, input, listing);

  const today = new Date().toISOString().slice(0, 10);
  const planned = withPlaces(playbook, source.places);
  const placed = pickedDays(planned, input.placeDates, today) ?? await placePlaybook(planned, {
    workspaceId: ws.id, startDate: input.startDate, today, hasArea,
    pickedDates: input.postDates?.every((d) => ISO_DAY.test(d) && d >= today) ? input.postDates : null,
    eventDate: moment.eventAt?.toISOString().slice(0, 10) ?? null,
    hasFace: playbook.placement === 'fill' ? await hasBrandFace(ws.id) : false,
  });
  if (placed.length === 0) throw new HttpError(409, 'no_free_days', playbook.placement === 'fill' ? 'Every day that week already has a post.' : 'Nothing to plan for those days. Try another one.');
  const startDate = placed[0]!.date;
  const fill = fillOf(place, moment);

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ws.id,
      goal: 'leads',
      playbook: playbook.id,
      listingId: listing?.id ?? null,
      channels,
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      weeks: Math.max(Math.ceil(playbook.windowDays / 7), Math.ceil((dayIndexOf(placed.at(-1)!.date, startDate) + 1) / 7)),
      step: 2,
      ...moment,
      posts: {
        create: placed.map(({ beat, date }, i): Prisma.CampaignPostCreateWithoutCampaignInput => ({
          dayIndex: dayIndexOf(date, startDate),
          scheduledFor: new Date(`${date}T00:00:00.000Z`),
          template: { connect: { id: beat.templateId } },
          version: { connect: { id: beat.versionId } },
          purpose: 'awareness',
          source: 'real',
          position: i,
          format: beat.format,
          beatKey: beat.key,
          idea: fillIdea(beat.idea, cityFill(fill, source.places, beat.key)),
        })),
      },
    },
  });
  await syncPurposes(campaign.id);
  return getCampaign(ws.id, campaign.id);
};

/** Each post takes its template's primary purpose (the seeded beats know theirs). */
const syncPurposes = async (campaignId: string): Promise<void> => {
  const posts = await prisma.campaignPost.findMany({ where: { campaignId }, select: { id: true, template: { select: { primaryPurpose: true } } } });
  await Promise.all(posts.map((p) => prisma.campaignPost.update({ where: { id: p.id }, data: { purpose: p.template.primaryPurpose } })));
};

/** Signed URLs for what each playbook post has made so far; the video's status wins while it is still rendering. */
export const attachMedia = async (campaign: CampaignDto): Promise<CampaignDto> => {
  const rows = await prisma.campaignPost.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, slides: true, listingVideo: { select: { status: true, videoKey: true } } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const posts = await Promise.all(
    campaign.posts.map(async (post) => {
      const row = byId.get(post.id);
      if (!row) return post;
      const slides = (row.slides ?? []) as PlaybookSlide[];
      const slideUrls = (await Promise.all(slides.map((s) => getPresignedUrl(s.key, SIGN_SECONDS)))).filter((u): u is string => Boolean(u));
      const video = row.listingVideo;
      const videoUrl = video?.status === 'ready' && video.videoKey ? await getPresignedUrl(video.videoKey, SIGN_SECONDS) : null;
      const media: PostMediaDto = { coverUrl: slideUrls[0] ?? null, videoUrl, slideUrls };
      const mediaStatus = video ? videoStatus(video.status) : post.mediaStatus;
      return { ...post, media, mediaStatus };
    }),
  );
  return { ...campaign, posts };
};

const videoStatus = (status: string): CampaignDto['posts'][number]['mediaStatus'] =>
  status === 'ready' ? 'ready' : status === 'failed' ? 'failed' : 'generating';

/** Also gives back the credit of any post that failed since the last look. */
export const getPlaybookCampaign = async (workspaceId: string, campaignId: string): Promise<CampaignDto> => {
  await refundFailedPostsQuietly(workspaceId);
  return attachMedia(await getCampaign(workspaceId, campaignId));
};
