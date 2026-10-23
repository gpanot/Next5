// server-only. The three model actions on one blueprint day: write a script, change it, offer hooks.
// Every action is scoped to the blueprint's owner, rate limited per owner, and builds its prompt from the stored row.
// Cost is recorded by the model clients (api_cost_events, tagged with the session user and the route).
import { INSTRUCTION_MAX, type BlueprintDto } from '../../lib/blueprint/schema';
import { scriptHookSchema, type HookOption, type Script, type ScriptHook } from '../../lib/scriptGenerator/types';
import { HttpError } from '../http';
import { enforceRateLimit } from '../rateLimit';
import { generateScript } from '../scriptGenerator/generate';
import { generateHooks } from '../scriptGenerator/hooks';
import type { ModelCall } from '../scriptGenerator/model';
import { refineScript } from '../scriptGenerator/refine';
import { requireBlueprint, saveDayScript, type BlueprintOwner } from './blueprints';
import { toScriptInput } from './input';

/** Script, change and hook calls together, per owner per hour. Tune once real usage is known. */
export const SCRIPT_CALLS_PER_HOUR = 30;

const limit = (workspaceId: BlueprintOwner) => enforceRateLimit(`blueprint-script:${workspaceId ?? 'admin'}`, SCRIPT_CALLS_PER_HOUR, 3600);

/** Logs ids and timing only, never prompts or user text. */
const timed = async <T>(action: string, workspaceId: BlueprintOwner, dayIndex: number, run: () => Promise<T>): Promise<T> => {
  const started = Date.now();
  try {
    return await run();
  } finally {
    console.info(`[blueprint] ${action} workspace=${workspaceId ?? 'admin'} day=${dayIndex} ms=${Date.now() - started}`);
  }
};

export const parseChosenHook = (value: unknown): ScriptHook | undefined => {
  if (value === undefined || value === null) return undefined;
  const parsed = scriptHookSchema.safeParse(value);
  if (!parsed.success || !parsed.data.visual.trim() || !parsed.data.onScreen.trim()) throw new HttpError(400, 'invalid_hook', 'That hook is not valid.');
  return parsed.data;
};

export const parseInstruction = (value: unknown): string => {
  const instruction = typeof value === 'string' ? value.trim() : '';
  if (!instruction) throw new HttpError(400, 'instruction_required', 'Say what to change.');
  if (instruction.length > INSTRUCTION_MAX) throw new HttpError(400, 'instruction_too_long', `Keep it under ${INSTRUCTION_MAX} characters.`);
  return instruction;
};

type DayArgs = { workspaceId: BlueprintOwner; dayIndex: number; call?: ModelCall };

export const writeDayScript = async ({ workspaceId, dayIndex, call }: DayArgs, hook?: ScriptHook): Promise<{ script: Script; blueprint: BlueprintDto }> => {
  const input = toScriptInput(await requireBlueprint(workspaceId), dayIndex);
  await limit(workspaceId);
  const script = await timed('script', workspaceId, dayIndex, () => generateScript(input, hook, call));
  return { script, blueprint: await saveDayScript(workspaceId, dayIndex, script) };
};

export const changeDayScript = async ({ workspaceId, dayIndex, call }: DayArgs, instruction: string) => {
  const current = await requireBlueprint(workspaceId);
  const day = current.plan[dayIndex];
  if (!day?.script) throw new HttpError(400, 'script_required', 'Write the script first.');
  await limit(workspaceId);
  const out = await timed('refine', workspaceId, dayIndex, () => refineScript({ script: day.script as Script, instruction, format: day.format }, call));
  const blueprint = out.refused ? current : await saveDayScript(workspaceId, dayIndex, out.script);
  return { ...out, blueprint };
};

export const dayHookOptions = async ({ workspaceId, dayIndex, call }: DayArgs): Promise<HookOption[]> => {
  const input = toScriptInput(await requireBlueprint(workspaceId), dayIndex);
  await limit(workspaceId);
  return timed('hooks', workspaceId, dayIndex, () => generateHooks(input, call));
};
