// server-only — never import from a 'use client' file.
// Bank step 1: the meats (middle slides), one per goal, each slide with its own photo description.
// Text problems and conflicts between sets are sent back for a rewrite; photo problems get a cheaper photo-only rewrite.

import { prisma } from '../../../lib/db';
import { isContentGoal } from '../../../types/admin/contentGoals';
import type { BankItem, BankMeat } from '../../../types/admin/slideshowBank';
import type { SlideshowPattern } from '../../../types/admin/slideshowKnowledge';
import type { CostMeter } from '../../metaAds/cost';
import { metaAdsJson } from '../../metaAds/llm';
import { clip } from '../../metaAds/text';
import { meatProblems, photoProblem } from './checks';
import { CONSISTENCY_SYSTEM, MEAT_GOALS, MEAT_SYSTEM, PHOTO_FIX_SYSTEM } from './prompts';

const REWRITES = 2;
const MAX_STRUCTURES = 6;

type RawMeat = { goal?: unknown; topic?: unknown; promise?: unknown; listicle?: unknown; items?: unknown; caption?: unknown; hashtags?: unknown };
type RawItem = { title?: unknown; body?: unknown; photo?: unknown };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

const toItem = (raw: RawItem): BankItem => ({ title: str(raw.title, 90), body: str(raw.body, 220), photo: str(raw.photo, 400) });

const toHashtags = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.map((h) => str(h, 30).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase()).filter(Boolean))].slice(0, 6) : [];

/** Parsed meats in the asked goal order (a set with another goal keeps its place, with the goal it was asked for). */
export const toMeats = (raw: { meats?: RawMeat[] }): BankMeat[] =>
  (raw.meats ?? []).slice(0, MEAT_GOALS.length).map((m, i) => ({
    id: `m${i + 1}`,
    goal: isContentGoal(m.goal) ? m.goal : MEAT_GOALS[i]!,
    topic: str(m.topic, 120),
    promise: str(m.promise, 200),
    listicle: m.listicle === true,
    items: (Array.isArray(m.items) ? (m.items as RawItem[]) : []).map(toItem).filter((it) => it.title && it.body),
    caption: str(m.caption, 300),
    hashtags: toHashtags(m.hashtags),
  }));

/** Approved Knowledge Center models (drafts when none is approved) as slide-shape guidance. */
const provenStructures = async (): Promise<string> => {
  let rows = await prisma.slideshowModel.findMany({ where: { status: 'approved' }, orderBy: { updatedAt: 'desc' }, take: MAX_STRUCTURES });
  if (rows.length === 0) rows = await prisma.slideshowModel.findMany({ where: { status: 'draft' }, orderBy: { updatedAt: 'desc' }, take: MAX_STRUCTURES });
  const lines = rows.map((r) => {
    const p = r.pattern as unknown as SlideshowPattern;
    return `- ${p.format}: ${p.itemPattern}`;
  });
  return lines.length ? `\n\nPROVEN STRUCTURES (from slideshows that went viral):\n${lines.join('\n')}` : '';
};

const conflicts = async (meats: BankMeat[], meter: CostMeter): Promise<string[]> => {
  const text = meats.map((m, i) => `Set ${i + 1} (${m.goal}): ${m.items.map((it) => `"${it.title}" — ${it.body}`).join(' | ')}`).join('\n');
  const raw = await metaAdsJson<{ conflicts?: unknown }>(
    [{ role: 'system', content: CONSISTENCY_SYSTEM }, { role: 'user', content: text }],
    { maxTokens: 2_500, meter, label: 'OpenAI bank consistency' },
  );
  return Array.isArray(raw.conflicts) ? raw.conflicts.map((c) => str(c, 200)).filter(Boolean) : [];
};

/** Rewrites only the photo descriptions that break the photo rules, in one call. */
const fixPhotos = async (meats: BankMeat[], brief: string, meter: CostMeter): Promise<void> => {
  const bad = meats.flatMap((m) => m.items.filter((it) => photoProblem(it.photo)).map((it) => ({ it, problem: photoProblem(it.photo)! })));
  if (bad.length === 0) return;
  const raw = await metaAdsJson<{ photos?: unknown }>(
    [
      { role: 'system', content: PHOTO_FIX_SYSTEM },
      { role: 'user', content: `${brief}\n\n${bad.map(({ it, problem }, i) => `${i}. slide "${it.title} — ${it.body}" photo: "${it.photo}" -> ${problem}`).join('\n')}` },
    ],
    { maxTokens: 3_000, meter, label: 'OpenAI bank photo fix' },
  );
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  bad.forEach(({ it }, i) => {
    const next = str(photos[i], 400);
    if (next && !photoProblem(next)) it.photo = next;
  });
};

/** Writes the meats; throws only when no usable set came back. */
export const writeMeats = async (brief: string, brand: string, meter: CostMeter): Promise<BankMeat[]> => {
  const structures = await provenStructures();
  let meats: BankMeat[] = [];
  let problems: string[] = [];
  for (let attempt = 0; attempt <= REWRITES; attempt += 1) {
    const fix = problems.length ? `\n\nYour last answer had these problems. Fix them and return all ${MEAT_GOALS.length} sets:\n- ${problems.join('\n- ')}` : '';
    const raw = await metaAdsJson<{ meats?: RawMeat[] }>(
      [{ role: 'system', content: MEAT_SYSTEM }, { role: 'user', content: brief + structures + fix }],
      { maxTokens: 12_000, meter, label: 'OpenAI bank meats' },
    );
    meats = toMeats(raw);
    problems = meats.flatMap((m) => meatProblems(m, brand));
    if (problems.length === 0) problems = (await conflicts(meats, meter)).map((c) => `conflict: ${c}`);
    if (problems.length === 0) break;
  }
  // Sets still breaking a text rule after the rewrites are dropped; a few unresolved conflicts are not worth losing a set.
  const kept = meats.filter((m) => meatProblems(m, brand).length === 0);
  if (kept.length === 0) throw new Error(`No meat set passed the checks: ${problems.slice(0, 3).join('; ')}`);
  await fixPhotos(kept, brief, meter);
  return kept;
};
