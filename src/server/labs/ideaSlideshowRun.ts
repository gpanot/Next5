// server-only — never import from a 'use client' file.
// Slideshow calendar ideas are real slideshows, made while the user swipes the Blitz ideas (1-2 minutes). Each one is
// made in its own hidden run: a copy of the workspace run's profile and levers, no workspace (so it is never charged
// and never shows on a calendar), `ideaForRunId` pointing at the workspace run. Keeping it moves the slideshow, with its
// photos, into the workspace run, where it is charged like any slideshow.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoPhoto, AutoPlan, AutoSlide } from '../../types/admin/autoSlideshow';
import type { BankCombo } from '../../types/admin/slideshowBank';
import { HttpError } from '../http';
import { chargeSlideshow } from '../slideshowCredits/charge';
import { presignObject } from '../storage/objectStore';

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Creates the hidden run for `combo`, ready for `runAutoPipeline(id, 3, 1)` (plan step with the requested combo). */
export async function createIdeaRun(mainRunId: string, combo: BankCombo): Promise<string> {
  const main = await prisma.autoSlideshowRun.findUnique({ where: { id: mainRunId } });
  const bankId = (main?.plan as AutoPlan | null)?.bankId;
  if (!main || !main.profile || !main.levers || !bankId) throw new HttpError(409, 'no_bank', 'This run has no Slideshow Bank yet.');
  const plan: AutoPlan = { picks: [], photoPrompts: [], usedDrafts: false, bankId, requested: [combo] };
  const run = await prisma.autoSlideshowRun.create({
    data: {
      url: main.url, count: 1, workspaceId: null, ideaForRunId: main.id, brandProfileId: main.brandProfileId,
      profile: json(main.profile), levers: json(main.levers), plan: json(plan), status: 'STEP_3_RUNNING',
    },
  });
  return run.id;
}

export type IdeaSlideshowState = { state: 'making' | 'ready' | 'failed'; slideshowId: string | null; slides: string[] };

/** Where an idea's slideshow is: still being made, ready (its rendered slides), or failed. */
export async function ideaSlideshowState(ideaRunId: string): Promise<IdeaSlideshowState> {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: ideaRunId }, select: { status: true, slideshows: { select: { id: true, status: true, slides: true } } } });
  const show = run?.slideshows[0];
  if (!run || run.status === 'FAILED' || show?.status === 'failed') return { state: 'failed', slideshowId: show?.id ?? null, slides: [] };
  if (!show || show.status !== 'ready') return { state: 'making', slideshowId: show?.id ?? null, slides: [] };
  const keys = (show.slides as unknown as AutoSlide[]).map((s) => s.imageKey).filter((k): k is string => Boolean(k));
  const slides = (await Promise.all(keys.map((k) => presignObject(k)))).filter((u): u is string => Boolean(u));
  return { state: 'ready', slideshowId: show.id, slides };
}

/**
 * Moves a kept idea's ready slideshow into the workspace run: its photos are added to the run's photo set (slides point
 * at them), it goes after the run's slideshows, and it is charged. The hidden run is deleted. Returns the slideshow id.
 */
export async function adoptIdeaSlideshow(ideaRunId: string, mainRunId: string): Promise<string> {
  const [idea, main] = await Promise.all([
    prisma.autoSlideshowRun.findUnique({ where: { id: ideaRunId }, include: { slideshows: true } }),
    prisma.autoSlideshowRun.findUnique({ where: { id: mainRunId }, select: { photos: true, count: true, status: true } }),
  ]);
  const show = idea?.slideshows[0];
  if (!idea || idea.ideaForRunId !== mainRunId || !main) throw new HttpError(404, 'idea_not_found', 'Idea not found.');
  if (!show || show.status !== 'ready') throw new HttpError(409, 'not_ready', 'This slideshow is still being made. Try again in a minute.');
  // The run's photo set is rewritten while it makes slideshows: wait for it to finish.
  if (main.status !== 'COMPLETED' && main.status !== 'FAILED') throw new HttpError(409, 'run_busy', 'Slideshows are still being made. Try again when they are done.');
  const own = (main.photos as AutoPhoto[] | null) ?? [];
  const offset = own.length;
  const slides = (show.slides as unknown as AutoSlide[]).map((s) => ({ ...s, photoIndex: s.photoIndex + offset }));
  const last = await prisma.autoSlideshow.aggregate({ where: { runId: mainRunId }, _max: { position: true } });
  await prisma.$transaction([
    prisma.autoSlideshowRun.update({ where: { id: mainRunId }, data: { photos: json([...own, ...((idea.photos as AutoPhoto[] | null) ?? [])]), count: main.count + 1 } }),
    prisma.autoSlideshow.update({ where: { id: show.id }, data: { runId: mainRunId, position: (last._max.position ?? -1) + 1, slides: json(slides) } }),
    prisma.autoSlideshowRun.delete({ where: { id: ideaRunId } }),
  ]);
  await chargeSlideshow(mainRunId, show.id);
  return show.id;
}
