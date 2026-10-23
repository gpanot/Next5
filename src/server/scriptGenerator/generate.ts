// server-only. generateScript: plain inputs in, one validated Script out. Callable headlessly (campaigns can use it later).
import type { Script, ScriptHook } from '../../lib/scriptGenerator/types';
import { HttpError } from '../http';
import { callBlueprintModel, type ModelCall } from './model';
import { normalizeScript } from './normalize';
import { BLUEPRINT_SCRIPT_SCHEMA, buildBlueprintSystem, buildBlueprintUser, type BlueprintScriptInput } from './rules';
import type { ToolDef } from './anthropic';

const SCRIPT_TOOL: ToolDef = { name: 'submit_script', description: 'Submit the finished script.', input_schema: BLUEPRINT_SCRIPT_SCHEMA, strict: true };

/** Runs `attempt`; on an unusable answer (SCRIPT_INVALID or no tool call) tries exactly once more. */
export async function withOneRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (err) {
    const retryable = err instanceof HttpError && (err.code === 'SCRIPT_INVALID' || err.code === 'no_tool_result' || err.code === 'invalid_hooks');
    if (!retryable) throw err;
    return attempt();
  }
}

export async function generateScript(input: BlueprintScriptInput, hook?: ScriptHook, call: ModelCall = callBlueprintModel): Promise<Script> {
  const system = buildBlueprintSystem(input);
  const user = buildBlueprintUser(input, hook);
  return withOneRetry(async () => normalizeScript(await call(system, user, SCRIPT_TOOL), input.format));
}
