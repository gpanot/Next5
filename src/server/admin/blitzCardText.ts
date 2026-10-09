// server-only — never import from a 'use client' file.
// A saved Blitz card's slides as the admin reads them: hook, meat lines (labelled by the story's format), CTA.

import { FORMAT_DEFS, STAGES, isFormat } from '../labs/blitzFormats';

/** Meat slides of a card, in story order (hook and CTA are shown apart): shot role → story beat. */
const MEAT_ROLES: Array<[string, keyof typeof FORMAT_DEFS.problem_fix.labels]> = [
  ['pain', 'pain'],
  ['old_way', 'oldWay'],
  ['mechanism', 'mechanism'],
  ['proof', 'proof'],
  ['inaction', 'inaction'],
];

/** "Myth → truth"… for a format; '' for none (stories written before formats). */
export const formatLabel = (format: unknown): string => (isFormat(format) ? FORMAT_DEFS[format].label : '');

/** "Attention"… for a stage; '' for none. */
export const stageLabel = (stage: unknown): string =>
  typeof stage === 'string' && (STAGES as readonly string[]).includes(stage) ? stage.replace(/^\w/, (c) => c.toUpperCase()) : '';

/** Beat labels of a format (problem → fix when it has none). */
export const beatLabels = (format: unknown) => FORMAT_DEFS[isFormat(format) ? format : 'problem_fix'].labels;

export type CardShotText = { role?: string; text?: string };

export type CardText = { hook: string; meat: Array<{ label: string; text: string }>; cta: string };

const textOf = (shots: CardShotText[], role: string) =>
  shots.filter((s) => s.role === role && s.text).map((s) => s.text).join(' / ');

export const cardText = (shots: CardShotText[] | null | undefined, format?: unknown): CardText => {
  const list = shots ?? [];
  const labels = beatLabels(format);
  return {
    hook: textOf(list, 'hook'),
    meat: MEAT_ROLES.map(([role, beat]) => ({ label: labels[beat], text: textOf(list, role) })).filter((m) => m.text),
    cta: textOf(list, 'cta'),
  };
};
