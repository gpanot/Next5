// server-only — never import from a 'use client' file.
//
// What a workspace's Blitz ideas taught: each card made from a bank story scores from what the user did with it (kept
// or made +1, skipped −1) and, once posted, from its views against the workspace's median (blitzStats.ts): up to ±3.
// Scores add up per story format and per hook type (smoothed, so one card moves little), and stories whose video beat
// the median by far are winners. The bank uses this (blitzBank.ts): better formats get more new stories and go first,
// better hook types lead, and winners get follow-up stories in the later stages (same trigger, deeper).

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';

/** Smoothing: a score counts as if PRIOR cards at 0 came first. */
const PRIOR = 2;
/** Views ratio (to the median) that makes a winner. */
const WINNER_RATIO = 2;
/** Posted videos with numbers needed before views count (a median of 1–2 is noise). */
const MIN_POSTS_FOR_VIEWS = 3;
const VIEWS_WEIGHT = 1.5;

export type LearnedScore = { score: number; cards: number };

export type BlitzLearning = {
  format: Map<string, LearnedScore>;
  archetype: Map<string, LearnedScore>;
  /** Stories whose video got at least WINNER_RATIO × the median views, best first. */
  winners: Array<{ storyId: string; views: number; ratio: number }>;
  kept: number;
  skipped: number;
  posted: number;
  medianViews: number | null;
};

export const NO_LEARNING: BlitzLearning = { format: new Map(), archetype: new Map(), winners: [], kept: 0, skipped: 0, posted: 0, medianViews: null };

type CardRow = { story_id: string; format: string | null; archetype: string; status: string; views: number | null };

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const SWIPE: Record<string, number> = { kept: 1, made: 1, discarded: -1 };

/** One card's score: the user's swipe, plus its views against the median (log2, capped at ±2, weighted). */
export const cardScore = (status: string, views: number | null, med: number | null): number => {
  const swipe = SWIPE[status] ?? 0;
  if (views === null || !med) return swipe;
  return swipe + VIEWS_WEIGHT * Math.max(-2, Math.min(2, Math.log2(Math.max(views, 1) / med)));
};

const add = (map: Map<string, { sum: number; cards: number }>, key: string, score: number) => {
  const cur = map.get(key) ?? { sum: 0, cards: 0 };
  map.set(key, { sum: cur.sum + score, cards: cur.cards + 1 });
};

const smooth = (map: Map<string, { sum: number; cards: number }>): Map<string, LearnedScore> =>
  new Map([...map].map(([k, v]) => [k, { score: v.sum / (v.cards + PRIOR), cards: v.cards }]));

/** Scores from rows (exported for tests). Cards still waiting for a swipe count for nothing. */
export function learnFrom(rows: CardRow[]): BlitzLearning {
  const views = rows.flatMap((r) => (r.views !== null ? [r.views] : []));
  const med = views.length >= MIN_POSTS_FOR_VIEWS ? median(views) : null;
  const format = new Map<string, { sum: number; cards: number }>();
  const archetype = new Map<string, { sum: number; cards: number }>();
  const winners: BlitzLearning['winners'] = [];
  for (const r of rows) {
    if (r.status === 'proposed' && r.views === null) continue;
    const score = cardScore(r.status, med ? r.views : null, med);
    add(format, r.format ?? 'problem_fix', score);
    add(archetype, r.archetype, score);
    if (med && r.views !== null && r.views / med >= WINNER_RATIO) winners.push({ storyId: r.story_id, views: r.views, ratio: r.views / med });
  }
  return {
    format: smooth(format),
    archetype: smooth(archetype),
    winners: winners.sort((a, b) => b.ratio - a.ratio),
    kept: rows.filter((r) => r.status === 'kept' || r.status === 'made').length,
    skipped: rows.filter((r) => r.status === 'discarded').length,
    posted: views.length,
    medianViews: med,
  };
}

/** The workspace's learning from its Blitz idea cards. Never throws: no learning when it cannot be read. */
export async function loadLearning(workspaceId: string): Promise<BlitzLearning> {
  try {
    const rows = await prisma.$queryRaw<CardRow[]>(Prisma.sql`
      SELECT plan->'card'->'script'->>'storyId' AS story_id, plan->'card'->'script'->>'format' AS format,
        COALESCE(plan->'card'->'script'->>'archetype', archetype) AS archetype, status,
        (plan->'stats'->>'views')::float AS views
      FROM slideshow_variants
      WHERE workspace_id = ${workspaceId} AND engine = 'website' AND plan->'card'->'script'->>'storyId' IS NOT NULL`);
    return learnFrom(rows);
  } catch (err) {
    console.error(`[blitz-learning] workspace ${workspaceId}:`, err instanceof Error ? err.message : err);
    return NO_LEARNING;
  }
}

/** Score of a key (0 when nothing was learned about it). */
export const scoreOf = (map: Map<string, LearnedScore>, key: string): number => map.get(key)?.score ?? 0;
