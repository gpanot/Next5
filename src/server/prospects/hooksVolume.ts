// server-only — never import from a 'use client' file.
// A Prospect Pack's Hooks Volume campaign, built with no editor open: what a person does in the campaign editor, in
// order. The topic and the CTA come from the site's Slideshow Bank (a meat the Brand Cast slideshows did not use), the
// content slides from the Content tab's "Auto", then PROSPECT_HOOKS hook lines on those slides, every photo from stock
// (brand and shared library first, then Unsplash). No AI photos, no credits.

import { prisma } from '../../lib/db';
import type { AutoPlan } from '../../types/admin/autoSlideshow';
import type { BankCta, BankMeat, SlideshowBankContent } from '../../types/admin/slideshowBank';
import { emptyCampaignDraft, type CampaignCard, type CampaignDraft, type CampaignPhotoRef } from '../../types/admin/slideshowCampaign';
import { PROSPECT_HOOKS } from '../../types/admin/prospects';
import type { UserAccess } from '../autoSlideshow/access';
import { writeAutoContent } from '../autoSlideshow/campaign/autoContent';
import { generateCampaign } from '../autoSlideshow/campaign/generate';
import { autoPhoto, importPhoto } from '../autoSlideshow/campaign/photos';
import { matchLibrary } from '../autoSlideshow/campaign/stockMatch';
import { createCampaign, storeDraft } from '../autoSlideshow/campaign/store';
import { writeCampaignHooks } from '../autoSlideshow/campaign/writeHooks';

/** Most content slides: a short read keeps the 4 slideshows light. */
const MAX_CONTENT = 5;

type Topic = { meat: BankMeat | null; cta: BankCta | null; fallback: string };

/** The bank meat and CTA for the campaign: the first meat the brand run's slideshows did not use. */
const topicOf = async (brandRunId: string, brandName: string): Promise<Topic> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: brandRunId }, select: { url: true, plan: true } });
  const bank = run ? await prisma.slideshowBank.findUnique({ where: { url: run.url }, select: { content: true } }) : null;
  const content = bank?.content as unknown as SlideshowBankContent | undefined;
  const used = new Set(((run?.plan as unknown as AutoPlan | null)?.picks ?? []).map((p) => p.bank?.meatId));
  const meats = content?.meats ?? [];
  return { meat: meats.find((m) => !used.has(m.id)) ?? meats[0] ?? null, cta: content?.ctas[0] ?? null, fallback: `Tips from ${brandName}` };
};

/** One stock photo stored on the campaign: a library match when there is one, else the `nth` Unsplash result. */
const stockPhoto = async (runId: string, workspaceId: string, ref: CampaignPhotoRef | null, query: string, nth: number): Promise<number | null> => {
  const stored = ref
    ? await importPhoto(runId, workspaceId, ref).catch(() => autoPhoto(runId, { source: 'stock', query, nth }))
    : await autoPhoto(runId, { source: 'stock', query, nth });
  await stored.detect().catch(() => undefined);
  return stored.photo.index;
};

/** Photos one by one: Unsplash refuses bursts. A photo that fails is left out (null). */
const inTurn = async <T>(items: T[], make: (item: T, i: number) => Promise<number | null>): Promise<(number | null)[]> => {
  const out: (number | null)[] = [];
  for (const [i, item] of items.entries()) out.push(await make(item, i).catch(() => null));
  return out;
};

/** Searches to try for the hook photos, narrowest first: the written one, then it shorter word by word, then the cover's. */
export const hookQueries = (photoQuery: string, coverQuery: string): string[] => {
  const words = photoQuery.split(' ').filter(Boolean);
  const shorter = words.map((_, i) => words.slice(0, words.length - i).join(' '));
  return [...new Set([...shorter, coverQuery].map((q) => q.trim()).filter(Boolean))];
};

/** Hook photo `nth`: the first search with a result. Null when none has one. */
const hookPhoto = async (runId: string, workspaceId: string, queries: string[], nth: number): Promise<number | null> => {
  for (const query of queries) {
    const index = await stockPhoto(runId, workspaceId, null, query, nth).catch(() => null);
    if (index !== null) return index;
  }
  return null;
};

type Content = { cards: CampaignCard[]; coverQuery: string };

/** The content slides, then the CTA card, each with its stock photo. */
const contentCards = async (runId: string, workspaceId: string, topic: Topic): Promise<Content> => {
  const prompt = topic.meat ? `${topic.meat.topic}. ${topic.meat.promise}` : topic.fallback;
  const written = await writeAutoContent({ prompt, format: 'plain', length: 'short', tone: 'plain', research: false, samePhoto: false, photoSource: 'stock' }, [], MAX_CONTENT);
  const { libraryRefs, coverRef } = await matchLibrary(workspaceId, written.queries, written.coverQuery);
  const photos = await inTurn(written.titles, (_, i) => stockPhoto(runId, workspaceId, libraryRefs[i] ?? null, written.queries[i] || written.coverQuery, i));
  const ctaPhoto = await stockPhoto(runId, workspaceId, coverRef, written.coverQuery, written.titles.length).catch(() => photos.find((p) => p !== null) ?? null);
  const items: CampaignCard[] = written.titles.map((title, i) => ({ role: 'item', title, body: '', photo: photos[i] ?? ctaPhoto }));
  const cta: CampaignCard = { role: 'cta', title: topic.cta?.title || 'Follow for more', body: topic.cta?.body ?? '', photo: ctaPhoto };
  return { cards: [...items, cta], coverQuery: written.coverQuery };
};

/** Saves the draft over what the run holds (its photos were added one by one in their own statements). */
const saveDraft = async (runId: string, draft: CampaignDraft) => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { campaign: true } });
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { campaign: storeDraft(run, draft) } });
};

/**
 * Creates and makes the campaign (PROSPECT_HOOKS slideshows) for the placeholder owner `access`. `onCreated` gets the
 * campaign id as soon as it exists, so a crash midway leaves a run the pack can point at. Returns the slideshow count.
 */
export const buildHooksVolume = async (access: UserAccess, workspaceId: string, brandRunId: string, brandName: string, onCreated: (id: string) => Promise<void>): Promise<number> => {
  const topic = await topicOf(brandRunId, brandName);
  const name = topic.meat?.topic.slice(0, 80) || topic.fallback;
  const runId = await createCampaign(workspaceId, name);
  await onCreated(runId);
  const { cards, coverQuery } = await contentCards(runId, workspaceId, topic);
  const draft: CampaignDraft = { ...emptyCampaignDraft(), cards };
  const { hooks, photoQuery } = await writeCampaignHooks(workspaceId, runId, name, draft, PROSPECT_HOOKS);
  const queries = hookQueries(photoQuery, coverQuery);
  const found = (await inTurn(hooks, (_, i) => hookPhoto(runId, workspaceId, queries, i))).filter((p): p is number => p !== null);
  // No stock result at all: the hooks open on the CTA card's photo, so the campaign still renders.
  const ctaPhoto = cards.at(-1)?.photo ?? null;
  const hookPhotos = found.length > 0 ? found : ctaPhoto !== null ? [ctaPhoto] : [];
  await saveDraft(runId, { ...draft, hooks, hookPhotos, hookPhotoQuery: photoQuery, caption: hooks[0] ?? name });
  return generateCampaign(access, runId);
};
