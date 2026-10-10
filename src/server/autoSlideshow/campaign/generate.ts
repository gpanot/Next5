// server-only — never import from a 'use client' file.
// "Generate": the campaign draft becomes one slideshow per hook line. Hook line i goes on hook photo i (photos loop
// when there are fewer); the content and CTA cards are rendered once and copied into every slideshow, so each
// slideshow owns its images (the slideshow editor replaces and deletes them one by one). No AI, no credits.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/db';
import type { AutoSlide } from '../../../types/admin/autoSlideshow';
import { campaignProblems, hookPhotoFor, renderKeyOf, type CampaignDraft } from '../../../types/admin/slideshowCampaign';
import { DEFAULT_BOX } from '../../companyIntel/slideshowStyle';
import { HttpError } from '../../http';
import { deleteObject, putObject } from '../../storage/objectStore';
import type { UserAccess } from '../access';
import { headsFor, withDetectedHeads, type HeadsCache } from '../heads';
import { renderSlide, type PhotoCache } from '../render';
import { draftOf, isRendered, json, loadCampaign, photosOf, storeDraft, type CampaignPhoto } from './store';

const LIVE_POSTS = ['scheduled', 'sending', 'processing', 'posted'];
/** Slides rendered at once: Satori renders are memory hungry. */
const RENDER_BATCH = 4;

type SlideText = Pick<AutoSlide, 'role' | 'title' | 'body' | 'look'> & { photoIndex: number };

/** Runs `work` over `items`, `size` at a time, keeping their order. */
const inBatches = async <T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  return out;
};

/** The hook and CTA slides take the picked look; Default stores none. */
const lookFor = (draft: CampaignDraft, role: AutoSlide['role']) => (draft.look !== 'default' && (role === 'hook' || role === 'cta') ? { look: draft.look } : {});

const plannedSlides = (draft: CampaignDraft) => ({
  hooks: draft.hooks.map((title, i): SlideText => ({ role: 'hook', title, body: '', photoIndex: hookPhotoFor(draft, i)!, ...lookFor(draft, 'hook') })),
  cards: draft.cards.map((c): SlideText => ({ role: c.role, title: c.title.trim(), body: c.body.trim(), photoIndex: c.photo!, ...lookFor(draft, c.role) })),
});

const renderAll = async (slides: SlideText[], photos: CampaignPhoto[], heads: HeadsCache): Promise<Buffer[]> => {
  const cache: PhotoCache = new Map();
  // Photos imported before head detection finished: detect them all at once, not one per render batch.
  await Promise.all([...new Set(slides.map((s) => s.photoIndex))].map((i) => (photos[i] ? headsFor(photos[i], cache, heads) : null)));
  return inBatches(slides, RENDER_BATCH, async (slide) => {
    const photo = photos[slide.photoIndex];
    if (!photo?.imageKey) throw new HttpError(409, 'photo_missing', 'A photo of this campaign is missing. Pick it again.');
    return renderSlide(slide, photo.imageKey, cache, DEFAULT_BOX, await headsFor(photo, cache, heads));
  });
};

type Upload = { key: string; jpeg: Buffer };

/** Every slideshow's slides with their image keys, and the files to store. */
const buildShows = (runId: string, plan: ReturnType<typeof plannedSlides>, hookJpegs: Buffer[], cardJpegs: Buffer[]) => {
  const batch = Date.now().toString(36);
  const uploads: Upload[] = [];
  const shows = plan.hooks.map((hook, i) => {
    const slides = [hook, ...plan.cards].map((s, j): AutoSlide => {
      const key = `admin/auto-slideshow/${runId}/campaign-${batch}/${i}-${j}.jpg`;
      uploads.push({ key, jpeg: j === 0 ? hookJpegs[i]! : cardJpegs[j - 1]! });
      const { photoIndex, ...text } = s;
      return { ...text, photoIndex, imageKey: key };
    });
    return { hook: hook.title, slides };
  });
  return { shows, uploads };
};

/**
 * Makes the campaign's slideshows, for Schedule. When they were already made from this draft, only the caption is
 * copied onto them (no render). Otherwise renders the draft, replacing the ones made before; refused while any of them
 * is scheduled or posted (cancel those first), so a post never loses its slideshow. Returns how many slideshows exist.
 */
export const generateCampaign = async (access: UserAccess, id: string): Promise<number> => {
  const run = await loadCampaign(access, id);
  const draft = draftOf(run);
  const problems = campaignProblems(draft);
  if (problems.length > 0) throw new HttpError(409, 'campaign_incomplete', problems[0]!);
  const existing = await prisma.autoSlideshow.count({ where: { runId: id } });
  const caption = draft.caption.trim();
  if (isRendered(run, existing)) {
    await prisma.autoSlideshow.updateMany({ where: { runId: id }, data: { caption, hashtags: [] } });
    return existing;
  }
  const live = await prisma.autoSlideshowPost.count({ where: { runId: id, status: { in: LIVE_POSTS } } });
  if (live > 0) throw new HttpError(409, 'campaign_scheduled', 'Some slideshows are already scheduled or posted. Cancel those posts in the Calendar to change this campaign.');

  const photos = photosOf(run);
  const plan = plannedSlides(draft);
  const heads: HeadsCache = new Map();
  const [hookJpegs, cardJpegs] = [await renderAll(plan.hooks, photos, heads), await renderAll(plan.cards, photos, heads)];
  const { shows, uploads } = buildShows(id, plan, hookJpegs, cardJpegs);
  await inBatches(uploads, 8, (u) => putObject(u.key, u.jpeg, 'image/jpeg'));

  const old = await prisma.autoSlideshow.findMany({ where: { runId: id }, select: { slides: true } });
  const name = run.name ?? 'Campaign';
  const withHeads = await withDetectedHeads(photos, heads);
  await prisma.$transaction([
    prisma.autoSlideshow.deleteMany({ where: { runId: id } }),
    prisma.autoSlideshow.createMany({
      data: shows.map((s, position) => ({ runId: id, position, modelName: name, hookPattern: s.hook, topic: s.hook, caption, slides: s.slides as unknown as Prisma.InputJsonValue, status: 'ready' })),
    }),
    prisma.autoSlideshowRun.update({ where: { id }, data: { count: shows.length, finishedAt: new Date(), campaign: storeDraft(run, draft, renderKeyOf(draft)), ...(withHeads ? { photos: json(withHeads) } : {}) } }),
  ]);
  const oldKeys = old.flatMap((show) => (show.slides as unknown as AutoSlide[]).flatMap((s) => (s.imageKey ? [s.imageKey] : [])));
  await inBatches(oldKeys, 8, (key) => deleteObject(key).catch(() => undefined));
  return shows.length;
};
