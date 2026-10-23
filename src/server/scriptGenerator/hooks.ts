// server-only. generateHooks: 3 hook options across different angles, for "Show me hook options".
import { HOOK_ANGLES, type HookOption } from '../../lib/scriptGenerator/types';
import { HttpError } from '../http';
import type { ToolDef } from './anthropic';
import { withOneRetry } from './generate';
import { callBlueprintModel, type ModelCall } from './model';
import { stripDashes } from './normalize';
import { BLUEPRINT_FORMAT_RULES, BLUEPRINT_HOOKS_SCHEMA, buildBlueprintHooksSystem, buildBlueprintUser, type BlueprintScriptInput } from './rules';

const HOOKS_TOOL: ToolDef = { name: 'submit_hooks', description: 'Submit the 3 hook options.', input_schema: BLUEPRINT_HOOKS_SCHEMA, strict: true };

const clean = (value: unknown, max: number): string => (typeof value === 'string' ? stripDashes(value).slice(0, max) : '');

/** Keeps well-formed hooks with distinct angles. Fewer than 3 is an unusable answer. */
export function validateHooks(value: unknown, spoken: boolean): HookOption[] {
  const raw = (value as { hooks?: unknown } | null)?.hooks;
  const hooks: HookOption[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const h = (item ?? {}) as Record<string, unknown>;
    const angle = HOOK_ANGLES.find((a) => a === h.angle);
    const hook = { visual: clean(h.visual, 400), onScreen: clean(h.onScreen, 120), spoken: spoken ? clean(h.spoken, 400) : '' };
    if (angle && hook.visual && hook.onScreen && (!spoken || hook.spoken) && !hooks.some((o) => o.angle === angle)) hooks.push({ angle, ...hook });
  }
  if (hooks.length < 3) throw new HttpError(502, 'invalid_hooks', 'The hook options came back in a shape we cannot use. Try again.');
  return hooks.slice(0, 3);
}

export async function generateHooks(input: BlueprintScriptInput, call: ModelCall = callBlueprintModel): Promise<HookOption[]> {
  const system = buildBlueprintHooksSystem(input);
  const user = buildBlueprintUser(input);
  return withOneRetry(async () => validateHooks(await call(system, user, HOOKS_TOOL), BLUEPRINT_FORMAT_RULES[input.format].spoken));
}
