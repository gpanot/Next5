// server-only — never import from a 'use client' file.
// Campaign posts not on the Calendar yet, for the day panel's Slideshows deck: one per hook, made or not.

import type { AutoSlideshow, AutoSlideshowPost, BlitzAsset, Prisma } from '@prisma/client';
import type { AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { campaignProblems, type CampaignWaitingDto } from '../../../types/admin/slideshowCampaign';
import { draftShows } from '../../../components/admin/autoSlideshow/campaigns/previewSlides';
import { listTracks } from '../music';
import { toSlideshowDto } from '../store';
import { draftOf, isRendered, photosOf, planOf, previewPhotoOf } from './store';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

type Show = AutoSlideshow & { audio: BlitzAsset | null; posts: AutoSlideshowPost[] };
export type WaitingRun = { id: string; campaign: Prisma.JsonValue; photos: Prisma.JsonValue; slideshows: Show[] };

const isLive = (show: Show) => show.posts.some((p) => LIVE.includes(p.status));

/** Made from the current draft: each ready slideshow not planned or scheduled, as rendered. */
const madeWaiting = (run: WaitingRun, planned: Set<number>): Promise<CampaignWaitingDto[]> =>
  Promise.all(run.slideshows.filter((s) => s.status === 'ready' && !isLive(s) && !planned.has(s.position)).map(async (s) => {
    const dto = await toSlideshowDto(s);
    return { campaignId: run.id, position: s.position, made: true, slides: dto.slides.flatMap((x) => (x.imageUrl ? [{ kind: 'rendered' as const, imageUrl: x.imageUrl }] : [])), audio: dto.audio ? { url: dto.audio.url, startAt: dto.audio.startAt } : null };
  }));

/** Not made yet (or changed since): the draft drawn per hook. Making it (free) replaces the old ones, so a campaign
 *  with a post already out, or with something left to fill in, offers nothing. */
const draftWaiting = async (run: WaitingRun, planned: Set<number>, tracks: AutoTrackDto[]): Promise<CampaignWaitingDto[]> => {
  const draft = draftOf(run);
  if (campaignProblems(draft).length > 0 || run.slideshows.some(isLive)) return [];
  const photos = await Promise.all(photosOf(run).map((p) => previewPhotoOf(p, true)));
  const track = tracks.find((t) => t.assetId === draft.audioAssetId);
  const audio = track ? { url: track.url, startAt: track.startAt } : null;
  return draftShows(draft, photos).flatMap((show, position) => (planned.has(position) ? [] : [{ campaignId: run.id, position, made: false, slides: show.slides, audio }]));
};

/** Every campaign post of the workspace that could go on a day: made ones as they are, the others as drafts. */
export const campaignWaiting = async (runs: WaitingRun[]): Promise<CampaignWaitingDto[]> => {
  const tracks = runs.some((r) => !isRendered(r, r.slideshows.length)) ? await listTracks().catch((): AutoTrackDto[] => []) : [];
  const lists = await Promise.all(runs.map((run) => {
    const planned = new Set(planOf(run).map((p) => p.position));
    return isRendered(run, run.slideshows.length) ? madeWaiting(run, planned) : draftWaiting(run, planned, tracks);
  }));
  return lists.flat();
};
