// server-only. The text model behind Brand Blueprint scripts, hooks and edits.
import { callClaude, type ToolDef } from './anthropic';
import { callOpenAi } from './openai';

/** One structured call: system prompt, user data, the tool whose input is the answer. Returns the tool input. */
export type ModelCall = (system: string, user: string, tool: ToolDef) => Promise<unknown>;

/**
 * BLUEPRINT_SCRIPT_MODEL picks the model: GPT-6.1 Sol at medium reasoning (default, cheaper) or Claude Opus 5.5 at low
 * effort. Both record their cost in api_cost_events, tagged with the signed-in user and the route.
 */
export const BLUEPRINT_MODEL = process.env.BLUEPRINT_SCRIPT_MODEL === 'claude-opus-5-5' ? 'claude-opus-5-5' : 'gpt-6.1-sol';

export const callBlueprintModel: ModelCall = (system, user, tool) =>
  BLUEPRINT_MODEL === 'claude-opus-5-5'
    ? callClaude(system, user, tool, { model: 'claude-opus-5-5', effort: 'low', fallbacks: true })
    : callOpenAi(system, user, tool, 'medium');
