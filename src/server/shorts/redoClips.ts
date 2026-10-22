// server-only — never import from a 'use client' file.
// Makes every clip of a finished short again without redoing the script, voice or photos: the old clips are dropped,
// optionally each shot's motion action is rewritten under the current rules, then the pipeline runs steps 4 and 5.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { createMeter, type CostMeter } from '../metaAds/cost';
import type { StepCost } from '../../types/admin/metaAds';
import type { ShortBeat, ShortInputs, VideoPromptMode } from '../../types/admin/shorts';
import { creativeJson, smartModel, withTextModel } from './llm';
import { MOTION_ACTION_RULES } from './photoFormula';
import { runShortPipeline } from './pipeline';

const json = (v: unknown) => v as Prisma.InputJsonValue;

const SYSTEM = `You write ONE motion action per shot for a short video clip. The clip starts from the shot's photo and lasts 4-6 seconds.
RULES:
${MOTION_ACTION_RULES}
Return flat JSON keys only: {"action_0": string, "action_1": string, ...}`;

const user = (beats: ShortBeat[]) =>
  beats.map((b) => `Shot ${b.idx} (camera: ${b.motionHint ?? 'slow_zoom_in'}): line "${b.text}". Photo: ${b.imagePrompt ?? ''}`).join('\n');

/** New motion actions by beat index; a beat the model skipped keeps its old one. */
const rewriteActions = async (beats: ShortBeat[], meter: CostMeter): Promise<ShortBeat[]> => {
  const raw = await creativeJson<Record<string, unknown>>(SYSTEM, user(beats), meter, 'Motion actions', smartModel());
  return beats.map((b) => {
    const v = raw[`action_${b.idx}`];
    return typeof v === 'string' && v.trim() ? { ...b, motionAction: v.trim() } : b;
  });
};

/** Clears the clips (and the stale video prompts), then starts steps 4-5 in the background. The caller has checked the short is idle. */
export const redoClips = async (id: string, mode: VideoPromptMode, rewrite: boolean): Promise<void> => {
  const short = await prisma.shortReel.findUniqueOrThrow({ where: { id } });
  const inputs = short.inputs as unknown as ShortInputs;
  const meter = createMeter();
  let beats = short.beats as unknown as ShortBeat[];
  if (rewrite) beats = await withTextModel(inputs.textModel, () => rewriteActions(beats, meter));
  const cleared = beats.map((b) => ({ ...b, clipKey: undefined, clipTaskId: undefined, clipSourceUrl: undefined, clipError: null, clipMs: undefined, videoPrompt: undefined }));
  const costs = short.stepCosts as unknown as Record<string, StepCost>;
  const spent = meter.summary();
  const step3 = costs['3'] ?? { usdMicros: 0, items: [] };
  const stepCosts = spent.usdMicros ? { ...costs, 3: { usdMicros: step3.usdMicros + spent.usdMicros, items: [...step3.items, ...spent.items] } } : costs;
  await prisma.shortReel.update({
    where: { id },
    data: { beats: json(cleared), inputs: json({ ...inputs, videoPromptMode: mode }), stepCosts: json(stepCosts), status: 'STEP_4_RUNNING', error: null, failedStep: null, finishedAt: null },
  });
  await runShortPipeline(id, 4, true);
};
