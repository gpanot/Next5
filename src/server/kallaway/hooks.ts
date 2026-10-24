// server-only. generateKallawayHooks: a pasted video plan in, its hook analyzed + 3 Kallaway-formula variants out.
import { CORE_PARTS, HOOK_PARTS, HOOK_SUBJECTS, type HookParts, type HookVariant, type KallawayHooksResult } from '../../lib/kallaway/types';
import { HttpError } from '../http';
import type { ToolDef } from '../scriptGenerator/anthropic';
import { withOneRetry } from '../scriptGenerator/generate';
import { callBlueprintModel, type ModelCall } from '../scriptGenerator/model';
import { stripDashes } from '../scriptGenerator/normalize';
import { KALLAWAY_HOOKS_SCHEMA, KALLAWAY_SYSTEM } from './prompt';

const HOOKS_TOOL: ToolDef = { name: 'submit_hooks', description: 'Submit the hook analysis and the 3 variants.', input_schema: KALLAWAY_HOOKS_SCHEMA, strict: true };

const MAX_PLAN = 8000;

const clean = (value: unknown, max: number): string => (typeof value === 'string' ? stripDashes(value).trim().slice(0, max) : '');

/** The pasted video plan. 400 when empty or too short to carry a payoff. */
export function parsePlan(body: Record<string, unknown>): string {
  const plan = typeof body.plan === 'string' ? body.plan.trim() : '';
  if (plan.length < 40) throw new HttpError(400, 'bad_request', 'Paste the full video plan (hook, problem, payoff).');
  return plan.slice(0, MAX_PLAN);
}

const cleanParts = (value: unknown): HookParts => {
  const raw = (value ?? {}) as Record<string, unknown>;
  return Object.fromEntries(HOOK_PARTS.map((p) => [p, clean(raw[p], 200)])) as HookParts;
};

/** Keeps variants with a spoken line and all 4 core parts, one per subject type. Fewer than 3 is unusable. */
export function validateResult(value: unknown): KallawayHooksResult {
  const raw = (value ?? {}) as { original?: Record<string, unknown>; variants?: unknown };
  const variants: HookVariant[] = [];
  for (const item of Array.isArray(raw.variants) ? raw.variants : []) {
    const v = (item ?? {}) as Record<string, unknown>;
    const subjectType = HOOK_SUBJECTS.find((s) => s === v.subjectType);
    const parts = cleanParts(v.parts);
    const spoken = clean(v.spoken, 300);
    if (!subjectType || !spoken || CORE_PARTS.some((p) => !parts[p]) || variants.some((o) => o.subjectType === subjectType)) continue;
    variants.push({
      subjectType, spoken, parts,
      onScreen: clean(v.onScreen, 120),
      onScreenAudience: clean(v.onScreenAudience, 120),
      baseState: clean(v.baseState, 300),
      newReality: clean(v.newReality, 300),
      why: clean(v.why, 400),
    });
  }
  if (variants.length < 3) throw new HttpError(502, 'invalid_hooks', 'The hooks came back in a shape we cannot use. Try again.');
  const original = raw.original ?? {};
  return {
    original: { hook: clean(original.hook, 400), parts: cleanParts(original.parts), verdict: clean(original.verdict, 400) },
    variants: variants.slice(0, 3),
  };
}

export async function generateKallawayHooks(plan: string, call: ModelCall = callBlueprintModel): Promise<KallawayHooksResult> {
  const user = `VIDEO PLAN:\n${plan}`;
  return withOneRetry(async () => validateResult(await call(KALLAWAY_SYSTEM, user, HOOKS_TOOL)));
}
