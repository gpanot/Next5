// server-only — never import from a 'use client' file.
// Slideshow campaigns: runs of kind 'campaign', built by hand. Create, list, read and save the draft (src/types/admin/slideshowCampaign.ts).

import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import type { AutoPhoto, AutoSlide, AutoTrackDto } from '../../../types/admin/autoSlideshow';
import {
  CAMPAIGN_ROW_THUMBS,
  emptyCampaignDraft,
  MAX_CAMPAIGN_CONTENT,
  MAX_CAPTION_CHARS,
  MAX_PHOTO_QUERY_CHARS,
  MAX_CAMPAIGN_HOOK_PHOTOS,
  MAX_CAMPAIGN_HOOKS,
  MAX_CARD_BODY_CHARS,
  MAX_CARD_TITLE_CHARS,
  MAX_HOOK_CHARS,
  MIN_CAMPAIGN_CONTENT,
  looksOf,
  renderKeyOf,
  MAX_CARD_PHOTOS,
  type CampaignCard,
  type CampaignDraft,
  type CampaignDto,
  type CampaignPlanItem,
  type CampaignPhotoDto,
  type CampaignPhotoJobDto,
  type CampaignSummaryDto,
} from '../../../types/admin/slideshowCampaign';
import { parseTextAt, type TextAt } from '../../../types/slideText';
import { listTracks, matchTracks, trackDto } from '../music';
import { draftShows, type PreviewSlide } from '../../../components/admin/autoSlideshow/campaigns/previewSlides';
import { parseBadgesAt, parseStoreBadges } from '../../../types/storeBadges';
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
/** `hotlink`: an Unsplash photo's own URLs, shown in the app instead of our copy (`imageKey`, kept for the render). */
/** `origin` (since 2026-10-14): 'ai' when made for this campaign, 'copy' when copied from another generated photo or an
 *  App shot, so the Generated tab lists each AI photo once. Missing on older photos. */
export type CampaignPhoto = AutoPhoto & { source?: CampaignPhotoDto['source']; origin?: 'ai' | 'copy'; credit?: CampaignPhotoDto['credit']; hotlink?: { thumb: string; full: string } };

export const photosOf = (run: { photos: Prisma.JsonValue }): CampaignPhoto[] => (run.photos as unknown as CampaignPhoto[] | null) ?? [];

/** A background photo still running after this long was cut off (the server stopped): shown as failed. */
const JOB_TIMEOUT_MS = 10 * 60 * 1000;

/** The run's Content "Auto" photo jobs (photoJobs.ts), as the editor reads them. */
const photoJobsOf = (run: { photoJobs: Prisma.JsonValue }, now = Date.now()): CampaignPhotoJobDto[] =>
  ((run.photoJobs as unknown as Array<CampaignPhotoJobDto & { startedAt?: string }> | null) ?? []).map(({ startedAt, ...job }) =>
    job.status === 'running' && startedAt && now - new Date(startedAt).getTime() > JOB_TIMEOUT_MS ? { ...job, status: 'failed', error: 'A photo took too long. Add it by hand.' } : job);
/** The stored campaign: the draft, the render key of the draft the slideshows were last made from, and the posts put on
 *  the Calendar (by slideshow position, so they survive a remake). */
type StoredCampaign = CampaignDraft & { renderedKey?: string; plan?: CampaignPlanItem[] };

/** Drafts saved before 2026-10-11 hold one `look`; it becomes the hook and CTA looks. */
const storedOf = (run: { campaign: Prisma.JsonValue }): StoredCampaign => {
  const raw = (run.campaign as unknown as (Partial<StoredCampaign> & { look?: unknown }) | null) ?? {};
  const merged: StoredCampaign & { look?: unknown } = { ...emptyCampaignDraft(), ...raw, looks: looksOf(raw) };
  delete merged.look;
  return merged;
};

export const draftOf = (run: { campaign: Prisma.JsonValue }): CampaignDraft => {
  const stored: Partial<StoredCampaign> = storedOf(run);
  delete stored.renderedKey;
  delete stored.plan;
  return stored as CampaignDraft;
};

/** The campaign's posts on the Calendar whose time is still to come, by position. */
export const planOf = (run: { campaign: Prisma.JsonValue }, now = new Date()): CampaignPlanItem[] =>
  (storedOf(run).plan ?? []).filter((p) => new Date(p.at) > now);

/** The stored campaign with its Calendar plan replaced. */
export const storePlan = (run: { campaign: Prisma.JsonValue }, plan: CampaignPlanItem[]) => json({ ...storedOf(run), plan });

/** True when the run's slideshows were made from its current draft. */
export const isRendered = (run: { campaign: Prisma.JsonValue }, slideshowCount: number): boolean => {
  const stored = storedOf(run);
  return slideshowCount > 0 && stored.renderedKey === renderKeyOf(stored);
};

/** Stores the draft, keeping the render key unless `renderedKey` is given. */
export const storeDraft = (run: { campaign: Prisma.JsonValue }, draft: CampaignDraft, renderedKey?: string) => {
  const stored = storedOf(run);
  return json({ ...draft, renderedKey: renderedKey ?? stored.renderedKey, ...(stored.plan ? { plan: stored.plan } : {}) });
};

/** The campaign run, when the signed-in user owns its workspace; 404 otherwise (no hint that it exists). */
export const loadCampaign = async (access: UserAccess, id: string) => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { id, kind: CAMPAIGN_KIND } });
  if (!run?.workspaceId) throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  await requireSlideshowWorkspace(access.userId, run.workspaceId).catch(() => {
    throw new HttpError(404, 'campaign_not_found', 'Campaign not found.');
  });
  return run;
};

type BlankCheck = { name: string | null; campaign: Prisma.JsonValue; photos: Prisma.JsonValue; photoJobs: Prisma.JsonValue; slideshowCount: number };

/** Nothing done yet: no name, hook, text, caption, photo (nor one on its way) or slideshow. Text looks alone count as nothing. */
export const isBlankCampaign = (run: BlankCheck): boolean => {
  const draft = draftOf(run);
  const jobs = (run.photoJobs as unknown[] | null) ?? [];
  return (
    (run.name ?? DEFAULT_NAME) === DEFAULT_NAME &&
    run.slideshowCount === 0 &&
    photosOf(run).length === 0 &&
    jobs.length === 0 &&
    draft.hooks.length === 0 &&
    !draft.caption.trim() &&
    draft.cards.every((c) => !c.title.trim() && !c.body.trim())
  );
};

/**
 * A new campaign, or the workspace's newest blank one when it has one: opening "New campaign" and leaving it untouched,
 * again and again, leaves one blank campaign behind, not a pile (blank ones are hidden from the list).
 */
export const createCampaign = async (workspaceId: string, name?: string): Promise<string> => {
  if (!name) {
    const recent = await prisma.autoSlideshowRun.findMany({
      where: { workspaceId, kind: CAMPAIGN_KIND },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, campaign: true, photos: true, photoJobs: true, _count: { select: { slideshows: true } } },
    });
    const blank = recent.find((r) => isBlankCampaign({ ...r, slideshowCount: r._count.slideshows }));
    // Reused as new: it moves to the top of the list once something is added. One without music gets its track.
    if (blank) {
      const draft = draftOf(blank);
      const audio = draft.audioAssetId ? null : await startingAudio(workspaceId);
      const data = { createdAt: new Date(), ...(audio ? { campaign: json({ ...draft, ...audio }) } : {}) };
      return (await prisma.autoSlideshowRun.update({ where: { id: blank.id }, data, select: { id: true } })).id;
    }
  }
  const campaign = { ...emptyCampaignDraft(), ...(await startingAudio(workspaceId)) };
  const run = await prisma.autoSlideshowRun.create({
    // `count` >= 1 is a DB rule; Generate sets it to the number of slideshows made.
    data: { kind: CAMPAIGN_KIND, workspaceId, name: cleanName(name), url: '', count: 1, status: 'COMPLETED', finishedAt: new Date(), photos: json([]), campaign: json(campaign) },
    select: { id: true },
  });
  return run.id;
};

/** A new campaign's music: a random TikTok sound the workspace did not use lately. */
const startingAudio = async (workspaceId: string): Promise<{ audioAssetId?: string }> => {
  const [pick] = await matchTracks(1, workspaceId);
  return pick ? { audioAssetId: pick.assetId } : {};
};

const cleanName = (name: unknown): string => (typeof name === 'string' && name.trim() ? name.trim().slice(0, MAX_NAME_CHARS) : DEFAULT_NAME);

/** One thumb per post (hook), as many as a list row shows: the made slideshow's first slide, else the hook's photo. */
const postThumbsOf = (draft: CampaignDraft, photos: CampaignPhoto[], shows: { slides: Prisma.JsonValue }[]): (string | null)[] =>
  draft.hooks.slice(0, CAMPAIGN_ROW_THUMBS).map((_, i) => {
    const madeKey = (shows[i]?.slides as unknown as AutoSlide[] | undefined)?.[0]?.imageKey;
    if (madeKey) return thumbUrl(madeKey);
    const photoIndex = draft.hookPhotos[i] ?? draft.hookPhotos[0];
    const photo = photoIndex !== undefined ? photos[photoIndex] : undefined;
    return photo?.hotlink?.thumb ?? (photo?.imageKey ? thumbUrl(photo.imageKey) : null);
  });

/**
 * When each listed post goes out, as the Calendar shows it: its live post's time, else the time planned for it (a ready
 * slideshow waiting there for approval), else null.
 */
const postDatesOf = (
  draft: CampaignDraft,
  run: { campaign: Prisma.JsonValue; slideshows: { position: number; status: string; posts: { scheduledAt: Date }[] }[] },
): (string | null)[] => {
  const plan = new Map(planOf(run).map((p) => [p.position, p.at]));
  return draft.hooks.slice(0, CAMPAIGN_ROW_THUMBS).map((_, i) => {
    const show = run.slideshows[i];
    if (!show) return null;
    return show.posts[0]?.scheduledAt.toISOString() ?? (show.status === 'ready' ? plan.get(show.position) ?? null : null);
  });
};

type PreviewShowRow = { status: string; slides: Prisma.JsonValue; audioStart: number; audio: { id: string; name: string; r2Key: string } | null };

/** A campaign with no music gets a TikTok sound (any track when none is tagged), always the same for a campaign
 *  (picked from its id). */
const stableTrackOf = (id: string, tracks: AutoTrackDto[]): AutoTrackDto | null => {
  const tiktok = tracks.filter((t) => t.tiktok);
  const pool = tiktok.length > 0 ? tiktok : tracks;
  return pool.length ? pool[[...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0) % pool.length]! : null;
};

/** The music a card plays: the made slideshow's, else the draft's, else the campaign's stable pick (saved once the
 *  editor opens it, see withSavedMusic). */
const previewAudioOf = async (id: string, draft: CampaignDraft, show: PreviewShowRow | undefined, tracks: AutoTrackDto[]): Promise<{ url: string; startAt: number } | null> => {
  const made = show ? await trackDto(show.audio, show.audioStart) : null;
  const track = made ?? tracks.find((t) => t.assetId === draft.audioAssetId) ?? stableTrackOf(id, tracks);
  return track ? { url: track.url, startAt: track.startAt } : null;
};

/** A campaign with no music gets its music saved: the made slideshow's track, else the one its card
 *  plays. Skipped when the draft changed meanwhile, so an editor save is never overwritten. */
const withSavedMusic = async (run: { id: string; campaign: Prisma.JsonValue; slideshows: { audioAssetId: string | null }[] }): Promise<CampaignDraft> => {
  const draft = draftOf(run);
  if (draft.audioAssetId || run.campaign === null) return draft;
  const audioAssetId = run.slideshows[0]?.audioAssetId ?? stableTrackOf(run.id, await listTracks().catch((): AutoTrackDto[] => []))?.assetId;
  if (!audioAssetId) return draft;
  const saved = await prisma.autoSlideshowRun.updateMany({
    where: { id: run.id, campaign: { equals: run.campaign as Prisma.InputJsonValue } },
    data: { campaign: json({ ...storedOf(run), audioAssetId }) },
  });
  return saved.count > 0 ? { ...draft, audioAssetId } : draft;
};

/** The first slideshow as its card plays it: the made slides while they are ready, else the draft's first hook drawn
 *  on its photos (thumbs). Null while there is no photo to show. */
const previewOf = async (r: { id: string; photos: Prisma.JsonValue; slideshows: PreviewShowRow[] }, draft: CampaignDraft, tracks: AutoTrackDto[]): Promise<CampaignSummaryDto['preview']> => {
  const show = r.slideshows[0];
  const made = show?.status === 'ready' ? (show.slides as unknown as AutoSlide[]) : [];
  const slides: PreviewSlide[] = made.length > 0 && made.every((s) => s.imageKey)
    ? made.map((s) => ({ kind: 'rendered', imageUrl: thumbUrl(s.imageKey!) }))
    : (draftShows(draft, photosOf(r).map((p) => ({ url: p.hotlink?.thumb ?? (p.imageKey ? thumbUrl(p.imageKey) : null), fullUrl: null, ...(p.heads ? { heads: p.heads } : {}) })))[0]?.slides ?? []);
  if (!slides.some((s) => s.kind === 'rendered' || s.photoUrl)) return null;
  return { slides, audio: await previewAudioOf(r.id, draft, show, tracks) };
};

export const listCampaigns = async (workspaceId: string): Promise<CampaignSummaryDto[]> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, kind: CAMPAIGN_KIND },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, name: true, campaign: true, photos: true, photoJobs: true, createdAt: true, updatedAt: true, slideshows: { orderBy: { position: 'asc' }, select: { position: true, status: true, slides: true, audioStart: true, audio: { select: { id: true, name: true, r2Key: true } }, posts: { where: { status: { in: LIVE_POSTS } }, orderBy: { scheduledAt: 'asc' }, take: 1, select: { scheduledAt: true } } } }, _count: { select: { posts: { where: { status: { in: LIVE_POSTS } } } } } },
  });
  const tracks = await listTracks().catch((): AutoTrackDto[] => []);
  // A campaign opened and left untouched has nothing to show: it stays hidden until something is added.
  return Promise.all(runs.filter((r) => !isBlankCampaign({ ...r, slideshowCount: r.slideshows.length })).map(async (r): Promise<CampaignSummaryDto> => {
    const draft = draftOf(r);
    const firstSlide = (r.slideshows[0]?.slides as unknown as AutoSlide[] | undefined)?.[0];
    const firstPhoto = draft.hookPhotos[0] !== undefined ? photosOf(r)[draft.hookPhotos[0]] : undefined;
    // A rendered slide is our own image; before rendering, an Unsplash hook photo shows from Unsplash (hotlinked).
    const coverKey = firstSlide?.imageKey ?? firstPhoto?.imageKey ?? null;
    const coverUrl = firstSlide?.imageKey ? thumbUrl(firstSlide.imageKey) : (firstPhoto?.hotlink?.thumb ?? (coverKey ? thumbUrl(coverKey) : null));
    return {
      id: r.id,
      name: r.name ?? DEFAULT_NAME,
      hookCount: draft.hooks.length,
      slideshowCount: r.slideshows.length,
      scheduledCount: r._count.posts,
      coverUrl,
      // A made slide already shows the hook; a bare photo gets the first hook drawn on it, as the editor does.
      coverHook: !firstSlide?.imageKey && draft.hooks[0] ? { title: draft.hooks[0], look: draft.looks.hook, ...(draft.hookTextAt ? { textAt: draft.hookTextAt } : {}) } : null,
      named: (r.name ?? DEFAULT_NAME) !== DEFAULT_NAME,
      firstHook: draft.hooks[0]?.trim() || null,
      postThumbs: postThumbsOf(draft, photosOf(r), r.slideshows),
      postDates: postDatesOf(draft, r),
      preview: await previewOf(r, draft, tracks),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }));
};

export const getCampaignDto = async (id: string): Promise<CampaignDto> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id }, include: { slideshows: { orderBy: { position: 'asc' }, include: SHOW_INCLUDE } } });
  // Thumbs: the editor shows photos at most 176 px wide.
  const photos = await Promise.all(photosOf(run).map(async (p, index): Promise<CampaignPhotoDto> => ({
    index,
    url: p.hotlink?.thumb ?? (p.imageKey ? thumbUrl(p.imageKey) : null),
    fullUrl: p.hotlink?.full ?? (p.imageKey ? await presignObject(p.imageKey) : null),
    source: p.source ?? 'generated',
    credit: p.credit ?? null,
    ...(p.heads ? { heads: p.heads } : {}),
  })));
  return {
    id: run.id,
    workspaceId: run.workspaceId ?? '',
    name: run.name ?? DEFAULT_NAME,
    draft: await withSavedMusic(run),
    photos,
    slideshows: await Promise.all(run.slideshows.map(toSlideshowDto)),
    rendered: isRendered(run, run.slideshows.length),
    plan: planOf(run),
    photoJobs: photoJobsOf(run),
    createdAt: run.createdAt.toISOString(),
  };
};

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const photoIndex = (v: unknown, photoCount: number): number | null => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < photoCount ? (v as number) : null);

/** A content card's rotation photos after the first, kept only when there are some (older drafts keep their render key). */
const morePhotosOf = (v: unknown, photoCount: number): Pick<CampaignCard, 'morePhotos'> => {
  const list = Array.isArray(v) ? v.map((x) => photoIndex(x, photoCount)).filter((x): x is number => x !== null).slice(0, MAX_CARD_PHOTOS - 1) : [];
  return list.length > 0 ? { morePhotos: list } : {};
};

/** A text position kept only when it is one (unmoved text stores none, so older drafts keep their render key). */
const movedTo = (v: unknown): { textAt?: TextAt } => {
  const at = parseTextAt(v);
  return at ? { textAt: at } : {};
};

/** The CTA's store badges, kept only when some are on (older drafts keep their render key). */
const badgesOf = (v: unknown, at: unknown): Pick<CampaignCard, 'badges' | 'badgesAt'> => {
  const badges = parseStoreBadges(v);
  const badgesAt = parseBadgesAt(at);
  return badges ? { badges, ...(badgesAt === undefined ? {} : { badgesAt }) } : {};
};

const parseCards = (value: unknown, photoCount: number): CampaignCard[] => {
  if (!Array.isArray(value)) throw new HttpError(400, 'bad_cards', 'The cards are missing.');
  const raw = value as Array<Record<string, unknown>>;
  const items = raw.slice(0, -1).map((c): CampaignCard => ({ role: 'item', title: str(c?.title, MAX_CARD_TITLE_CHARS), body: str(c?.body, MAX_CARD_BODY_CHARS), photo: photoIndex(c?.photo, photoCount), ...morePhotosOf(c?.morePhotos, photoCount), ...movedTo(c?.textAt), ...(c?.textFree === true ? { textFree: true } : {}) }));
  const last = raw[raw.length - 1];
  if (items.length < MIN_CAMPAIGN_CONTENT || items.length > MAX_CAMPAIGN_CONTENT || !last) {
    throw new HttpError(400, 'bad_cards', `A campaign has ${MIN_CAMPAIGN_CONTENT} to ${MAX_CAMPAIGN_CONTENT} content cards and one CTA card.`);
  }
  return [...items, { role: 'cta', title: str(last.title, MAX_CARD_TITLE_CHARS), body: str(last.body, MAX_CARD_BODY_CHARS), photo: photoIndex(last.photo, photoCount), ...movedTo(last.textAt), ...badgesOf(last.badges, last.badgesAt) }];
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
    looks: looksOf(d),
    ...(parseTextAt(d.hookTextAt) ? { hookTextAt: parseTextAt(d.hookTextAt) } : {}),
    caption: str(d.caption, MAX_CAPTION_CHARS),
    ...(str(d.hookPhotoQuery, MAX_PHOTO_QUERY_CHARS).trim() ? { hookPhotoQuery: str(d.hookPhotoQuery, MAX_PHOTO_QUERY_CHARS).trim() } : {}),
    ...(str(d.audioAssetId, 64).trim() ? { audioAssetId: str(d.audioAssetId, 64).trim() } : {}),
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
