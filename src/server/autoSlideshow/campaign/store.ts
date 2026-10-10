// server-only — never import from a 'use client' file.
// Slideshow campaigns: runs of kind 'campaign', built by hand. Create, list, read and save the draft (src/types/admin/slideshowCampaign.ts).

import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import type { AutoPhoto, AutoSlide } from '../../../types/admin/autoSlideshow';
import { isHookStyleId } from '../../../types/hookStyle';
import {
  emptyCampaignDraft,
  MAX_CAMPAIGN_CONTENT,
  MAX_CAPTION_CHARS,
  MAX_CAMPAIGN_HOOK_PHOTOS,
  MAX_CAMPAIGN_HOOKS,
  MAX_CARD_BODY_CHARS,
  MAX_CARD_TITLE_CHARS,
  MAX_HOOK_CHARS,
  MIN_CAMPAIGN_CONTENT,
  renderKeyOf,
  type CampaignCard,
  type CampaignDraft,
  type CampaignDto,
  type CampaignPhotoDto,
  type CampaignSummaryDto,
} from '../../../types/admin/slideshowCampaign';
import { HttpError } from '../../http';
import { presignObject } from '../../storage/objectStore';
import { thumbUrl } from '../../storage/thumbs';
import type { UserAccess } from '../access';
import { SHOW_INCLUDE, toSlideshowDto } from '../store';
import { requireSlideshowWorkspace } from '../workspaces';

export const CAMPAIGN_KIND = 'campaign';
const DEFAULT_NAME = 'Untitled campaign';
const MAX_NAME_CHARS = 80;
const LIVE_POSTS = ['scheduled', 'sending', 'processing', 'posted'];

export const json = (value: unknown) => value as Prisma.InputJsonValue;

/** A campaign photo: the run's AutoPhoto plus where it came from (`prompt` holds the label). */
export type CampaignPhoto = AutoPhoto & { source?: CampaignPhotoDto['source']; credit?: CampaignPhotoDto['credit'] };

export const photosOf = (run: { photos: Prisma.JsonValue }): CampaignPhoto[] => (run.photos as unknown as CampaignPhoto[] | null) ?? [];
/** The stored campaign: the draft, plus the render key of the draft the slideshows were last made from. */
type StoredCampaign = CampaignDraft & { renderedKey?: string };

const storedOf = (run: { campaign: Prisma.JsonValue }): StoredCampaign => ({ ...emptyCampaignDraft(), ...((run.campaign as unknown as StoredCampaign | null) ?? {}) });

export const draftOf = (run: { campaign: Prisma.JsonValue }): CampaignDraft => {
  const stored: Partial<StoredCampaign> = storedOf(run);
  delete stored.renderedKey;
  return stored as CampaignDraft;
};

/** True when the run's slideshows were made from its current draft. */
export const isRendered = (run: { campaign: Prisma.JsonValue }, slideshowCount: number): boolean => {
  const stored = storedOf(run);
  return slideshowCount > 0 && stored.renderedKey === renderKeyOf(stored);
};

/** Stores the draft, keeping the render key unless `renderedKey` is given. */
export const storeDraft = (run: { campaign: Prisma.JsonValue }, draft: CampaignDraft, renderedKey?: string) =>
  json({ ...draft, renderedKey: renderedKey ?? storedOf(run).renderedKey });

/** The campaign run, when the signed-in user owns its workspace; 404 otherwise (no hint that it exists). */
export const loadCampaign = async (access: UserAccess, id: string) => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { id, kind: CAMPAIGN_KIND } });
  if (!run?.workspaceId) throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  await requireSlideshowWorkspace(access.userId, run.workspaceId).catch(() => {
    throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  });
  return run;
};

export const createCampaign = async (workspaceId: string, name?: string): Promise<string> => {
  const run = await prisma.autoSlideshowRun.create({
    // `count` >= 1 is a DB rule; Generate sets it to the number of slideshows made.
    data: { kind: CAMPAIGN_KIND, workspaceId, name: cleanName(name), url: '', count: 1, status: 'COMPLETED', finishedAt: new Date(), photos: json([]), campaign: json(emptyCampaignDraft()) },
    select: { id: true },
  });
  return run.id;
};

const cleanName = (name: unknown): string => (typeof name === 'string' && name.trim() ? name.trim().slice(0, MAX_NAME_CHARS) : DEFAULT_NAME);

export const listCampaigns = async (workspaceId: string): Promise<CampaignSummaryDto[]> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, kind: CAMPAIGN_KIND },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, name: true, campaign: true, photos: true, createdAt: true, updatedAt: true, slideshows: { select: { slides: true } }, _count: { select: { posts: { where: { status: { in: LIVE_POSTS } } } } } },
  });
  return runs.map((r): CampaignSummaryDto => {
    const draft = draftOf(r);
    const firstSlide = (r.slideshows[0]?.slides as unknown as AutoSlide[] | undefined)?.[0];
    const firstPhoto = draft.hookPhotos[0] !== undefined ? photosOf(r)[draft.hookPhotos[0]]?.imageKey : null;
    const coverKey = firstSlide?.imageKey ?? firstPhoto ?? null;
    return {
      id: r.id,
      name: r.name ?? DEFAULT_NAME,
      hookCount: draft.hooks.length,
      slideshowCount: r.slideshows.length,
      scheduledCount: r._count.posts,
      coverUrl: coverKey ? thumbUrl(coverKey) : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
};

export const getCampaignDto = async (id: string): Promise<CampaignDto> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id }, include: { slideshows: { orderBy: { position: 'asc' }, include: SHOW_INCLUDE } } });
  // Thumbs: the editor shows photos at most 176 px wide.
  const photos = await Promise.all(photosOf(run).map(async (p, index): Promise<CampaignPhotoDto> => ({
    index,
    url: p.imageKey ? thumbUrl(p.imageKey) : null,
    fullUrl: p.imageKey ? await presignObject(p.imageKey) : null,
    source: p.source ?? 'generated',
    credit: p.credit ?? null,
  })));
  return {
    id: run.id,
    workspaceId: run.workspaceId ?? '',
    name: run.name ?? DEFAULT_NAME,
    draft: draftOf(run),
    photos,
    slideshows: await Promise.all(run.slideshows.map(toSlideshowDto)),
    rendered: isRendered(run, run.slideshows.length),
    createdAt: run.createdAt.toISOString(),
  };
};

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const photoIndex = (v: unknown, photoCount: number): number | null => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < photoCount ? (v as number) : null);

const parseCards = (value: unknown, photoCount: number): CampaignCard[] => {
  if (!Array.isArray(value)) throw new HttpError(400, 'bad_cards', 'The cards are missing.');
  const raw = value as Array<Record<string, unknown>>;
  const items = raw.slice(0, -1).map((c): CampaignCard => ({ role: 'item', title: str(c?.title, MAX_CARD_TITLE_CHARS), body: str(c?.body, MAX_CARD_BODY_CHARS), photo: photoIndex(c?.photo, photoCount) }));
  const last = raw[raw.length - 1];
  if (items.length < MIN_CAMPAIGN_CONTENT || items.length > MAX_CAMPAIGN_CONTENT || !last) {
    throw new HttpError(400, 'bad_cards', `A campaign has ${MIN_CAMPAIGN_CONTENT} to ${MAX_CAMPAIGN_CONTENT} content cards and one CTA card.`);
  }
  return [...items, { role: 'cta', title: str(last.title, MAX_CARD_TITLE_CHARS), body: str(last.body, MAX_CARD_BODY_CHARS), photo: photoIndex(last.photo, photoCount) }];
};

/** The draft a client sent, cleaned: text trimmed to its limits, photo indexes that exist, no repeated hook. */
export const parseDraft = (value: unknown, photoCount: number): CampaignDraft => {
  const d = (value ?? {}) as Record<string, unknown>;
  const hooks = Array.isArray(d.hooks) ? d.hooks.map((h) => str(h, MAX_HOOK_CHARS).trim()).filter(Boolean) : [];
  const hookPhotos = Array.isArray(d.hookPhotos) ? d.hookPhotos.map((i) => photoIndex(i, photoCount)).filter((i): i is number => i !== null) : [];
  return {
    hooks: [...new Set(hooks)].slice(0, MAX_CAMPAIGN_HOOKS),
    hookPhotos: [...new Set(hookPhotos)].slice(0, MAX_CAMPAIGN_HOOK_PHOTOS),
    cards: parseCards(d.cards, photoCount),
    look: isHookStyleId(d.look) ? d.look : 'default',
    caption: str(d.caption, MAX_CAPTION_CHARS),
  };
};

export type CampaignPatch = { name?: unknown; draft?: unknown };

export const saveCampaign = async (access: UserAccess, id: string, patch: CampaignPatch): Promise<void> => {
  const run = await loadCampaign(access, id);
  const data: Prisma.AutoSlideshowRunUpdateInput = {};
  if (patch.name !== undefined) data.name = cleanName(patch.name);
  if (patch.draft !== undefined) data.campaign = storeDraft(run, parseDraft(patch.draft, photosOf(run).length));
  await prisma.autoSlideshowRun.update({ where: { id }, data });
};
