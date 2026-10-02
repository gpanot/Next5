// Picking combos from a Slideshow Bank and turning one into slides. Pure: no database, no model calls.

import type { AutoSlide } from '../../../types/admin/autoSlideshow';
import type { ContentGoal } from '../../../types/admin/contentGoals';
import type { BankCombo, BankHook, BankMeat, SlideshowBankContent } from '../../../types/admin/slideshowBank';
import { libraryHook } from './library';

/** Uses per bank part id, and per hook category (so a batch does not open every slideshow with "Stop…"). */
export type BankUsage = { meats: Map<string, number>; hooks: Map<string, number>; ctas: Map<string, number>; categories: Map<string, number> };

export const emptyUsage = (): BankUsage => ({ meats: new Map(), hooks: new Map(), ctas: new Map(), categories: new Map() });

const uses = (map: Map<string, number>, id: string) => map.get(id) ?? 0;
const bump = (map: Map<string, number>, id: string) => map.set(id, uses(map, id) + 1);

/** The meat's least-used hook; ties go to the least-used category, then the best score. */
const nextHook = (hooks: BankHook[], usage: BankUsage): BankHook => {
  const fewest = Math.min(...hooks.map((h) => uses(usage.hooks, h.id)));
  const candidates = hooks.filter((h) => uses(usage.hooks, h.id) === fewest);
  return candidates.reduce((best, h) => {
    const diff = uses(usage.categories, h.category) - uses(usage.categories, best.category);
    return diff < 0 || (diff === 0 && h.score > best.score) ? h : best;
  });
};

/** The least-used item; ties go to the earlier one, or the higher `rank` when given. */
const leastUsed = <T extends { id: string }>(items: T[], map: Map<string, number>, rank: (t: T) => number = () => 0): T =>
  items.reduce((best, t) => {
    const diff = uses(map, t.id) - uses(map, best.id);
    return diff < 0 || (diff === 0 && rank(t) > rank(best)) ? t : best;
  });

/**
 * One combo per goal: the least-used meat of that goal (any meat when the bank has none for it), its least-used hook
 * (least-used category, then best score, on ties), and the least-used CTA. `usage` is updated, so a batch spreads like a run of single picks.
 */
export const pickCombos = (bank: SlideshowBankContent, usage: BankUsage, goals: ContentGoal[]): BankCombo[] => {
  const playable = bank.meats.filter((m) => bank.hooks.some((h) => h.meatId === m.id));
  if (playable.length === 0 || bank.ctas.length === 0) return [];
  return goals.map((goal) => {
    const forGoal = playable.filter((m) => m.goal === goal);
    const meat = leastUsed(forGoal.length > 0 ? forGoal : playable, usage.meats);
    const hook = nextHook(bank.hooks.filter((h) => h.meatId === meat.id), usage);
    const cta = leastUsed(bank.ctas, usage.ctas);
    bump(usage.meats, meat.id);
    bump(usage.hooks, hook.id);
    bump(usage.categories, hook.category);
    bump(usage.ctas, cta.id);
    return { meatId: meat.id, hookId: hook.id, ctaId: cta.id };
  });
};

/** A new hook (same meat) and CTA for a rewrite: the least-used ones other than the current, while others exist. */
export const swapCombo = (bank: SlideshowBankContent, usage: BankUsage, current: BankCombo): BankCombo => {
  const others = <T extends { id: string }>(items: T[], id: string) => (items.length > 1 ? items.filter((t) => t.id !== id) : items);
  const hooks = bank.hooks.filter((h) => h.meatId === current.meatId);
  if (hooks.length === 0 || bank.ctas.length === 0) throw new Error('This slideshow\'s bank parts no longer exist');
  const hook = nextHook(others(hooks, current.hookId), usage);
  const cta = leastUsed(others(bank.ctas, current.ctaId), usage.ctas);
  return { meatId: current.meatId, hookId: hook.id, ctaId: cta.id };
};

export type AssembledSlideshow = {
  meat: BankMeat;
  hook: BankHook;
  /** The library pattern the hook was written from, shown as the slideshow's hook pattern. */
  hookPattern: string;
  slides: Omit<AutoSlide, 'imageKey'>[];
  caption: string;
  hashtags: string[];
};

/** The slides of one combo. Every slide carries its photo description; step 5 makes a fresh photo for each. */
export const assembleCombo = (bank: SlideshowBankContent, combo: BankCombo): AssembledSlideshow => {
  const meat = bank.meats.find((m) => m.id === combo.meatId);
  const hook = bank.hooks.find((h) => h.id === combo.hookId);
  const cta = bank.ctas.find((c) => c.id === combo.ctaId);
  if (!meat || !hook || !cta) throw new Error('This slideshow\'s bank parts no longer exist');
  return {
    meat,
    hook,
    hookPattern: libraryHook(hook.patternId)?.text ?? hook.text,
    slides: [
      { role: 'hook', title: hook.text, body: '', photoPrompt: hook.photo, photoIndex: 0 },
      ...meat.items.map((it) => ({ role: 'item' as const, title: it.title, body: it.body, photoPrompt: it.photo, photoIndex: 0 })),
      { role: 'cta', title: cta.title, body: cta.body, photoPrompt: cta.photo, photoIndex: 0 },
    ],
    caption: meat.caption,
    hashtags: meat.hashtags,
  };
};
