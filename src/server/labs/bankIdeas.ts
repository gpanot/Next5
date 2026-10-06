// server-only — never import from a 'use client' file.
// Slideshow ideas for the calendar: the least-used Slideshow Bank combos (no model call). Each is then made as a real
// slideshow in a hidden run (./ideaSlideshowRun.ts) while the user swipes; until it is ready the calendar shows the
// hook, the slide titles and an existing photo of the run.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AutoPhoto } from '../../types/admin/autoSlideshow';
import { assignGoals, type ContentGoal } from '../../types/admin/contentGoals';
import type { BankCombo, SlideshowBankContent } from '../../types/admin/slideshowBank';
import { loadUsage } from '../autoSlideshow/bank/build';
import { assembleCombo, pickCombos, type BankUsage } from '../autoSlideshow/bank/pick';

/** What a bank idea saves in `slideshow_variants.plan`. */
export type BankIdeaPlan = {
  runId: string;
  /** The hidden run making this idea's slideshow. */
  ideaRunId?: string;
  combo: BankCombo;
  goal: ContentGoal;
  hook: string;
  outline: string[];
  coverKey: string | null;
  /** Asked for with "Create 3 slideshows": leads the deck once ready. */
  requested?: boolean;
};

type RunForIdeas = { id: string; url: string; photos: Prisma.JsonValue; plan: Prisma.JsonValue };

/** The run's bank, or null when the run has none yet (made before the bank, or its first plan is not done). */
export const bankOfRun = async (run: RunForIdeas): Promise<SlideshowBankContent | null> => {
  const bankId = (run.plan as { bankId?: string } | null)?.bankId;
  const row = bankId ? await prisma.slideshowBank.findUnique({ where: { id: bankId }, select: { content: true } }) : null;
  return (row?.content as unknown as SlideshowBankContent | undefined) ?? null;
};

type Covers = { byPrompt: Map<string, string>; byMeat: Map<string, string>; any: string | null };

/** Photos the run already has: by prompt (run photos), by meat (its slideshows' first slide), and any one. */
const loadCovers = async (run: RunForIdeas): Promise<Covers> => {
  const photos = ((run.photos as AutoPhoto[] | null) ?? []).filter((p) => p.imageKey && !p.deleted);
  const byPrompt = new Map(photos.map((p) => [p.prompt, p.imageKey!]));
  const shows = await prisma.autoSlideshow.findMany({ where: { runId: run.id, status: 'ready' }, select: { bankMeatId: true, slides: true }, orderBy: { position: 'asc' } });
  const byMeat = new Map<string, string>();
  let any: string | null = photos[0]?.imageKey ?? null;
  for (const s of shows) {
    const key = (s.slides as Array<{ imageKey?: string | null }>)[0]?.imageKey;
    if (!key) continue;
    any ??= key;
    if (s.bankMeatId && !byMeat.has(s.bankMeatId)) byMeat.set(s.bankMeatId, key);
  }
  return { byPrompt, byMeat, any };
};

/** One combo as an idea plan. */
export const bankIdeaPlan = (runId: string, bank: SlideshowBankContent, combo: BankCombo, covers: Covers): BankIdeaPlan => {
  const show = assembleCombo(bank, combo);
  const coverKey =
    covers.byPrompt.get(show.hook.photo) ?? show.meat.items.map((i) => covers.byPrompt.get(i.photo)).find(Boolean) ?? covers.byMeat.get(show.meat.id) ?? covers.any;
  return {
    runId,
    combo,
    goal: show.meat.goal,
    hook: show.hook.text,
    outline: show.meat.items.map((i) => i.title).slice(0, 6),
    coverKey: coverKey ?? null,
  };
};

/** Bank ideas already offered to the workspace count as used, so a new batch shows other hooks. */
const bumpOffered = async (workspaceId: string, usage: BankUsage): Promise<BankUsage> => {
  const offered = await prisma.slideshowVariant.findMany({ where: { workspaceId, engine: 'bank', status: { in: ['proposed', 'kept'] } }, select: { plan: true } });
  const bump = (map: Map<string, number>, id: string) => map.set(id, (map.get(id) ?? 0) + 1);
  for (const row of offered) {
    const combo = (row.plan as unknown as BankIdeaPlan).combo;
    bump(usage.meats, combo.meatId);
    bump(usage.hooks, combo.hookId);
    bump(usage.ctas, combo.ctaId);
  }
  return usage;
};

/** `count` new bank ideas for the run (least-used combos, following the goal mix). Empty when the run has no bank. */
export const newBankIdeas = async (workspaceId: string, runId: string, count: number): Promise<BankIdeaPlan[]> => {
  if (count <= 0) return [];
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { id: true, url: true, photos: true, plan: true } });
  const bank = run ? await bankOfRun(run) : null;
  if (!run || !bank) return [];
  const [usage, covers] = await Promise.all([loadUsage(run.url).then((u) => bumpOffered(workspaceId, u)), loadCovers(run)]);
  return pickCombos(bank, usage, assignGoals(count)).map((combo) => bankIdeaPlan(run.id, bank, combo, covers));
};
