// server-only. refineScript: edits one script from a short instruction. Off-topic instructions are refused by the
// prompt (scope guard from the MVP), and the server re-validates whatever comes back.
import type { BlueprintFormat, Script } from '../../lib/scriptGenerator/types';
import type { ToolDef } from './anthropic';
import { withOneRetry } from './generate';
import { callBlueprintModel, type ModelCall } from './model';
import { normalizeScript, stripDashes } from './normalize';
import { BLUEPRINT_EDIT_SCHEMA, buildBlueprintRefineSystem } from './rules';

const EDIT_TOOL: ToolDef = { name: 'submit_edit', description: 'Submit the edited script, or refuse if the request is off topic.', input_schema: BLUEPRINT_EDIT_SCHEMA, strict: true };

export type RefineResult = { refused: boolean; message: string; script: Script };

type RefineInput = { script: Script; instruction: string; format: BlueprintFormat };

const data = (value: string): string => value.replace(/[<>]/g, '');

export async function refineScript({ script, instruction, format }: RefineInput, call: ModelCall = callBlueprintModel): Promise<RefineResult> {
  const user = `<script>${data(JSON.stringify(script))}</script>\n<instruction>${data(instruction)}</instruction>`;
  return withOneRetry(async () => {
    const out = (await call(buildBlueprintRefineSystem(format), user, EDIT_TOOL)) as { refused?: unknown; message?: unknown; script?: unknown } | null;
    const message = typeof out?.message === 'string' ? stripDashes(out.message).slice(0, 300) : '';
    if (out?.refused === true) return { refused: true, message: message || 'I can only edit this script.', script };
    return { refused: false, message, script: normalizeScript(out?.script, format) };
  });
}
