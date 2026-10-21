// server-only — never import from a 'use client' file.
// A Prospect Pack moves on in small steps the admin tab asks for while it is open (POST …/advance, every few seconds):
// each call does what is next and possible, and two calls at once never do the same work (locks on the row). The parts:
//   cast   — the brand run's steps 4-6, released by approveFaces (3 Brand Cast slideshows)
//   hooks  — the Hooks Volume campaign (hooksVolume.ts), once
//   blitz  — PROSPECT_BLITZ Blitz ideas rendered (blitz.ts), each picked as soon as it is finished: from the site scan
//            on, without waiting for the face check
// A 'queued' pack starts here when its turn comes (queue.ts). When all three have settled, the days are planned (days.ts) and the pack is ready to share. Only the posts of the
// free days are made in full: the other Blitz ideas and Brand Cast slideshows are previews (first shot or slide) until
// the pack is unlocked (unlock.ts). Hooks Volume is stock photos only, so all of it is made.

import type { Prisma, ProspectPack } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import { blitzPending, fullCount, PROSPECT_BLITZ_TRIES, type ProspectBlitz, type ProspectDay, type ProspectKind } from '../../types/admin/prospects';
import type { UserAccess } from '../autoSlideshow/access';
import { runAutoPipeline } from '../autoSlideshow/pipeline';
import { withUserCostContext } from '../costs/ledger';
import { HttpError } from '../http';
import { wakeBlitzWorker } from '../labs/blitzWorkerWake';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { blitzPicked, blitzRenders, ideasById, renderBlitz, unpickedIdeas } from './blitz';
import { composeDays } from './days';
import { buildHooksVolume } from './hooksVolume';
import { startIfTurn } from './queue';
import { blitzOf, loadPack } from './store';

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** A Hooks Volume build that started this long ago without slideshows died (Vercel kills a job at its limit). */
const HOOKS_STALE_MS = 10 * 60 * 1000;

/** Blitz ideas still missing this long after the Brand Cast slideshows are done: the pack goes on with the videos it has. */
const BLITZ_GIVE_UP_MS = 15 * 60 * 1000;

const ownerAccess = async (pack: ProspectPack): Promise<UserAccess> => {
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: pack.ownerUserId }, select: { email: true } });
  return { admin: false, userId: pack.ownerUserId, email: owner.email, impersonated: true };
};

const fail = (id: string, message: string) => prisma.prospectPack.update({ where: { id }, data: { status: 'failed', error: message.slice(0, 1_000) } });

/** "Approve faces": releases the held run (steps 4-6 make the Brand Cast slideshows). Returns the job to run after the response. */
export const approveFaces = async (id: string): Promise<() => Promise<void>> => {
  const pack = await loadPack(id);
  if (pack.status !== 'faces') throw new HttpError(409, 'not_faces', 'This prospect is not waiting for a face check.');
  const faces = await prisma.brandCastMember.count({ where: { workspaceId: pack.workspaceId, archivedAt: null, imageKey: { not: null } } });
  if (faces === 0) throw new HttpError(409, 'no_faces', 'Make at least one face first.');
  const runId = pack.brandRunId!;
  const released = await prisma.autoSlideshowRun.updateMany({ where: { id: runId, status: 'HELD' }, data: { holdBeforeStep4: false } });
  if (released.count === 0) throw new HttpError(409, 'not_held', 'The run is not waiting. Refresh and try again.');
  await prisma.prospectPack.update({ where: { id }, data: { status: 'making', approvedAt: new Date() } });
  return () => withUserCostContext(pack.ownerUserId, () => runAutoPipeline(runId, 4));
};

/** The Hooks Volume part, when nobody is building it and it is not built. */
const advanceHooks = async (pack: ProspectPack): Promise<void> => {
  const stale = new Date(Date.now() - HOOKS_STALE_MS);
  if (pack.hooksRunId && (await prisma.autoSlideshow.count({ where: { runId: pack.hooksRunId } })) > 0) return;
  const locked = await prisma.prospectPack.updateMany({ where: { id: pack.id, OR: [{ hooksStartedAt: null }, { hooksStartedAt: { lt: stale } }] }, data: { hooksStartedAt: new Date() } });
  if (locked.count === 0) return;
  const onCreated = async (hooksRunId: string) => void (await prisma.prospectPack.update({ where: { id: pack.id }, data: { hooksRunId } }));
  await buildHooksVolume(await ownerAccess(pack), pack.workspaceId, pack.brandRunId!, pack.name, onCreated).catch((err: unknown) =>
    prisma.prospectPack.update({ where: { id: pack.id }, data: { error: `Hooks Volume: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1_000) } }),
  );
};

/** Tries again the picked ideas that failed for a reason that may pass. The row's updatedAt is the lock. */
const retryBlitz = async (pack: ProspectPack, picked: ProspectBlitz[]): Promise<void> => {
  const again = picked.filter((b) => !b.projectId && b.retry && (b.tries ?? 1) < PROSPECT_BLITZ_TRIES);
  if (again.length === 0) return;
  // Without its error while it runs, the idea counts as pending (blitzPending), so the pack waits for it.
  const started = picked.map((b) => (again.includes(b) ? { ideaId: b.ideaId, projectId: null, tries: (b.tries ?? 1) + 1 } : b));
  const locked = await prisma.prospectPack.updateMany({ where: { id: pack.id, updatedAt: pack.updatedAt }, data: { blitz: json(started) } });
  if (locked.count === 0) return;
  const ideas = await ideasById(pack.workspaceId, again.map((b) => b.ideaId));
  const previews = new Set(again.filter((b) => b.preview).map((b) => b.ideaId));
  const rendered = new Map((await renderBlitz(pack.ownerUserId, pack.workspaceId, pack.name, ideas, previews)).map((r) => [r.ideaId, r]));
  const merged = started.map((b) => {
    const r = rendered.get(b.ideaId);
    return r ? { ...r, tries: b.tries } : again.some((a) => a.ideaId === b.ideaId) ? { ...b, error: 'Idea not found.', retry: false } : b;
  });
  await prisma.prospectPack.update({ where: { id: pack.id }, data: { blitz: json(merged) } });
};

/** A picked idea whose photos are being found and render queued (a new pick, or a retry started). */
const inFlight = (b: ProspectBlitz): boolean => !b.projectId && !b.error && !b.preview;

/** The Blitz part: picks the ideas finished so far and queues their renders, one batch at a time (the photo scraper
 *  refuses bursts; the row's updatedAt is the lock), then retries. Ideas past the free days only get their photos. */
const advanceBlitz = async (pack: ProspectPack): Promise<void> => {
  const picked = blitzOf(pack);
  if (picked.some(inFlight)) return;
  const { ideas } = await unpickedIdeas(pack.workspaceId, new Set(picked.map((b) => b.ideaId)));
  if (ideas.length === 0) return retryBlitz(pack, picked);
  const started: ProspectBlitz[] = [...picked, ...ideas.map((i) => ({ ideaId: i.id, projectId: null }))];
  const locked = await prisma.prospectPack.updateMany({ where: { id: pack.id, updatedAt: pack.updatedAt }, data: { blitz: json(started) } });
  if (locked.count === 0) return;
  // Bank cards say whether they are previews (their images are held, labs/packPreviews.ts); others: past the free ones.
  const isPreview = (card: DeckItem | null, i: number) => (card?.script?.storyId ? Boolean(card.packPreview) : picked.length + i >= fullCount('blitz'));
  const previews = new Set(ideas.filter((idea, i) => isPreview(idea.card as DeckItem | null, i)).map((i) => i.id));
  const rendered = new Map((await renderBlitz(pack.ownerUserId, pack.workspaceId, pack.name, ideas, previews)).map((r) => [r.ideaId, r]));
  await prisma.prospectPack.update({ where: { id: pack.id }, data: { blitz: json(started.map((b) => rendered.get(b.ideaId) ?? b)) } });
};

type Settled = { posts: Record<ProspectKind, string[]>; previews: Set<string> } | null;

/** The run's cover-only slideshows whose first slide is rendered (Brand Cast previews), first position first. */
const coverShows = async (runId: string, positions: number[]): Promise<string[]> => {
  if (positions.length === 0) return [];
  const rows = await prisma.autoSlideshow.findMany({ where: { runId, status: 'written', position: { in: positions } }, orderBy: { position: 'asc' }, select: { id: true, slides: true } });
  return rows.filter((r) => (r.slides as unknown as AutoSlide[] | null)?.[0]?.imageKey).map((r) => r.id);
};

/** The made posts of each part, once every part has settled; null while any is still working. */
const settledPosts = async (pack: ProspectPack): Promise<Settled> => {
  const brand = await prisma.autoSlideshowRun.findUnique({ where: { id: pack.brandRunId! }, select: { status: true, finishedAt: true, coverOnlyPositions: true } });
  if (brand?.status !== 'COMPLETED' && brand?.status !== 'FAILED') return null;
  const hooksBuilding = pack.hooksStartedAt && !pack.error?.startsWith('Hooks Volume') && Date.now() - pack.hooksStartedAt.getTime() < HOOKS_STALE_MS;
  const hooksCount = pack.hooksRunId ? await prisma.autoSlideshow.count({ where: { runId: pack.hooksRunId } }) : 0;
  if (hooksCount === 0 && hooksBuilding) return null;
  const picked = blitzOf(pack);
  const allPicked = await blitzPicked(pack.workspaceId, picked);
  const gaveUp = !allPicked && !!brand.finishedAt && Date.now() - brand.finishedAt.getTime() > BLITZ_GIVE_UP_MS;
  if ((!allPicked && !gaveUp) || picked.some(blitzPending) || !(await blitzRenders(picked)).settled) return null;
  const shows = (runId: string | null) => (runId ? prisma.autoSlideshow.findMany({ where: { runId, status: 'ready' }, orderBy: { position: 'asc' }, select: { id: true } }) : Promise.resolve([]));
  const [cast, covers, hooks, videos] = await Promise.all([
    shows(pack.brandRunId),
    coverShows(pack.brandRunId!, brand.coverOnlyPositions),
    shows(pack.hooksRunId),
    prisma.blitzProject.findMany({ where: { id: { in: picked.flatMap((p) => (p.projectId ? [p.projectId] : [])) }, renderStatus: 'COMPLETED' }, select: { id: true } }),
  ]);
  const ideaPreviews = picked.filter((p) => p.preview && !p.error).map((p) => p.ideaId);
  const blitz = [...videos.map((v) => v.id), ...ideaPreviews];
  return { posts: { blitz, cast: [...cast.map((s) => s.id), ...covers], hooks: hooks.map((s) => s.id) }, previews: new Set([...ideaPreviews, ...covers]) };
};

/** Plans the days and opens the share link; a pack with nothing made fails instead. */
const finish = async (pack: ProspectPack, posts: Record<ProspectKind, string[]>, previews: Set<string>): Promise<void> => {
  if (posts.blitz.length + posts.cast.length + posts.hooks.length === 0) return void (await fail(pack.id, pack.error ?? 'Nothing could be made.'));
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: pack.workspaceId }, select: { ideaTzOffsetMin: true } });
  const days = composeDays(posts, new Date(), ws.ideaTzOffsetMin, previews);
  await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'making' }, data: { status: 'ready', days: json(days), readyAt: new Date() } });
};

/** A video that ended after the pack was ready (a render retried, or picked late) joins the days, until the pack is
 *  claimed: the days are planned again from the same first day, and the link keeps working (status stays 'ready'). */
const refinish = async (pack: ProspectPack): Promise<void> => {
  const planned = new Set(((pack.days as unknown as ProspectDay[] | null) ?? []).map((d) => d.refId));
  const settled = await settledPosts(pack);
  if (!settled || settled.posts.blitz.every((id) => planned.has(id))) return;
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: pack.workspaceId }, select: { ideaTzOffsetMin: true } });
  const days = composeDays(settled.posts, pack.readyAt ?? new Date(), ws.ideaTzOffsetMin, settled.previews);
  await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'ready', updatedAt: pack.updatedAt }, data: { days: json(days) } });
};

/** The faces are approved on their own as soon as they are made (2026-10-19: no admin face check), then the Brand Cast
 *  slideshows are made. With no face, the pack waits at the face check for faces made by hand. Never throws. */
const autoApprove = async (pack: ProspectPack): Promise<void> => {
  const job = await approveFaces(pack.id).catch((err: unknown) => {
    if (!(err instanceof HttpError && (err.code === 'not_held' || err.code === 'no_faces'))) console.warn(`[prospects] ${pack.id}: faces not approved:`, err instanceof Error ? err.message : err);
    return null;
  });
  await job?.();
};

/** The render worker sleeps when it has nothing to do, and a render put back in line (a retry) does not wake it:
 *  while a pack video waits, each step wakes it (throttled). Seen 2026-10-19: a re-queued video waited 10 min. */
const wakeForWaiting = async (pack: ProspectPack): Promise<void> => {
  if ((await blitzRenders(blitzOf(pack))).waiting > 0) wakeBlitzWorker({ throttle: true });
};

/** The step itself, for the pack as loaded. */
const stepPack = async (pack: ProspectPack): Promise<void> => {
  const id = pack.id;
  if (pack.status === 'queued') {
    const job = await startIfTurn(pack);
    return job ? job() : undefined;
  }
  if (pack.status === 'building') {
    const run = await prisma.autoSlideshowRun.findUnique({ where: { id: pack.brandRunId! }, select: { status: true, error: true } });
    if (run?.status === 'FAILED') return void (await fail(id, run.error ?? 'The site could not be read.'));
  }
  if (pack.status === 'faces') return void (await Promise.all([autoApprove(pack), advanceBlitz(pack)]));
  if (pack.status === 'building') return advanceBlitz(pack);
  if (pack.status === 'ready') return refinish(pack);
  if (pack.status !== 'making') return;
  await Promise.all([advanceHooks(pack), advanceBlitz(pack)]);
  const fresh = await loadPack(id);
  const settled = await settledPosts(fresh);
  if (settled) await finish(fresh, settled.posts, settled.previews);
};

/** One step forward (see the top of the file). Safe to call again and again; returns when this call's work is done.
 *  API costs go to the placeholder owner (the pack's cost, store.ts). */
export const advanceProspect = async (id: string): Promise<void> => {
  const pack = await loadPack(id);
  if (pack.status !== 'queued' && pack.status !== 'claimed' && pack.status !== 'failed') await wakeForWaiting(pack);
  await withUserCostContext(pack.ownerUserId, () => stepPack(pack));
};
