// server-only — never import from a 'use client' file.
// Step 3 of the realtor Autopilot: "Approve and make my posts". Books the calendar days, starts the listing videos, and
// makes the slideshows after the response. Plan: docs/business-studios/15-realtor-autopilot-plan.md §3.2.

import type { Workspace } from '@prisma/client';
import { after } from 'next/server';
import { prisma } from '../../lib/db';
import { disclosureLine, momentLine } from '../../lib/playbookMoment';
import { beatOf, isCardKind, type VideoPreset } from '../../lib/realtorPlaybooks';
import { HttpError } from '../http';
import { getListing } from '../listings/listings';
import { startListingVideos } from '../realtorVideo/jobs';
import { makeSlideshow } from '../realtorSlides/make';
import { makeMarketUpdate } from '../realtorSlides/marketUpdate';
import { makeTipSlideshow } from '../realtorSlides/tips';
import { videoCaption } from '../realtorSlides/videoCaption';
import type { CampaignDto } from './dto';
import { getPlaybookCampaign } from './playbook';
import { scheduleCampaign } from './schedule';

/** Slideshows rendered at once; each one fetches photos and renders up to 8 slides. */
const SLIDESHOW_SLOTS = 2;

type SlideshowJob = { id: string; beatKey: string | null };

/** Listing slideshows need the listing; market updates and tip carousels need only the workspace. */
const runSlideshows = async (jobs: SlideshowJob[], listingId: string | null, workspaceId: string): Promise<void> => {
  const listing = listingId ? await getListing(workspaceId, listingId) : null;
  const queue = [...jobs];
  const make = (job: SlideshowJob) => {
    const kind = beatOf(job.beatKey)?.slideshow;
    if (kind === 'market_stats') return makeMarketUpdate(job.id, workspaceId);
    if (isCardKind(kind)) return makeTipSlideshow(job.id, workspaceId);
    if (!listing) return prisma.campaignPost.update({ where: { id: job.id }, data: { mediaStatus: 'failed', mediaError: 'This home is no longer in your list.' } });
    return makeSlideshow(job.id, listing);
  };
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await make(job);
  };
  await Promise.all(Array.from({ length: SLIDESHOW_SLOTS }, worker));
};

/** Links each video post to its listing video row (one per preset). */
const startVideos = async (ws: Workspace, listingId: string, posts: CampaignDto['posts']): Promise<void> => {
  const wanted = posts
    .map((p) => ({ post: p, preset: beatOf(p.beatKey)?.preset }))
    .filter((x): x is { post: CampaignDto['posts'][number]; preset: VideoPreset } => Boolean(x.preset));
  if (wanted.length === 0) return;
  const rows = await startListingVideos(ws, listingId, [...new Set(wanted.map((w) => w.preset))]);
  await Promise.all(
    wanted.map(({ post, preset }) => {
      const row = rows.find((r) => r.preset === preset);
      return prisma.campaignPost.update({
        where: { id: post.id },
        data: row ? { listingVideoId: row.id, mediaStatus: 'generating' } : { mediaStatus: 'failed', mediaError: 'Video could not start.' },
      });
    }),
  );
};

/** Video posts have no writer of their own: their caption is built from the listing facts before the days are booked. */
const captionVideos = async (ws: Workspace, campaignId: string, listingId: string, posts: CampaignDto['posts']): Promise<void> => {
  const [listing, c] = await Promise.all([
    getListing(ws.id, listingId),
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { playbook: true, eventAt: true, eventEndAt: true, newPriceCents: true, oldPriceCents: true } }),
  ]);
  const moment = momentLine(c.playbook, { ...c, daysOnMarket: listing.daysOnMarket });
  const disclosure = disclosureLine(ws.agentName, ws.brokerage);
  await Promise.all(
    posts.map((p) => {
      const beat = beatOf(p.beatKey);
      return beat && !p.caption ? prisma.campaignPost.update({ where: { id: p.id }, data: { caption: videoCaption(listing, beat, moment, disclosure) } }) : null;
    }),
  );
};

export const approvePlaybook = async (ws: Workspace, campaignId: string): Promise<CampaignDto> => {
  const campaign = await getPlaybookCampaign(ws.id, campaignId);
  if (!campaign.playbook) throw new HttpError(400, 'not_playbook', 'This campaign is not a playbook.');
  if (campaign.status !== 'draft') throw new HttpError(409, 'already_scheduled', 'This plan is already approved.');
  const live = campaign.posts.filter((p) => !p.skipped);
  const videos = live.filter((p) => p.format === 'listing_video');

  // Videos first: they check the listing (city, price, photos) and throw a clear error before anything is booked.
  if (videos.length > 0) {
    if (!campaign.listingId) throw new HttpError(400, 'no_listing', 'This plan has no home for its videos.');
    await startVideos(ws, campaign.listingId, videos);
    await captionVideos(ws, campaign.id, campaign.listingId, videos);
  }
  await scheduleCampaign(ws.id, campaign.id);

  const jobs = live.filter((p) => p.format === 'slideshow').map((p) => ({ id: p.id, beatKey: p.beatKey }));
  await prisma.campaignPost.updateMany({ where: { id: { in: jobs.map((j) => j.id) } }, data: { mediaStatus: 'generating', mediaError: null } });
  const listingId = campaign.listingId;
  after(() => runSlideshows(jobs, listingId, ws.id));

  return getPlaybookCampaign(ws.id, campaign.id);
};

/** Makes one failed slideshow again (the "Try again" on its card). */
export const retryPlaybookPost = async (ws: Workspace, campaignId: string, postId: string): Promise<CampaignDto> => {
  const campaign = await getPlaybookCampaign(ws.id, campaignId);
  const post = campaign.posts.find((p) => p.id === postId);
  if (!post) throw new HttpError(404, 'not_found', 'Post not found.');
  if (post.format !== 'slideshow' || post.mediaStatus !== 'failed') throw new HttpError(409, 'not_failed', 'Only a failed slideshow can be made again.');
  await prisma.campaignPost.update({ where: { id: postId }, data: { mediaStatus: 'generating', mediaError: null } });
  const listingId = campaign.listingId;
  after(() => runSlideshows([{ id: post.id, beatKey: post.beatKey }], listingId, ws.id));
  return getPlaybookCampaign(ws.id, campaign.id);
};
