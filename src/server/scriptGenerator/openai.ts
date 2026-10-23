// server-only. The same job as anthropic.ts on OpenAI: one JSON object that matches a tool's schema.
// Reuses the Meta Ads JSON helper, which handles the GPT-5+ request shape and records the cost.
import { createMeter } from '../metaAds/cost';
import { metaAdsJson } from '../metaAds/llm';
import { HttpError } from '../http';
import type { ToolDef } from './anthropic';

export const OPENAI_SCRIPT_MODEL = process.env.SCRIPT_GENERATOR_OPENAI_MODEL || 'gpt-6.1-sol';

/** The prompts end with "call the X tool". On OpenAI there is no tool: ask for the JSON the tool would receive. */
const withJsonShape = (system: string, tool: ToolDef) =>
  `${system}

OUTPUT FORMAT: ignore any instruction above to call a tool. Reply with exactly one JSON object and nothing else. It is the input of the "${tool.name}" tool and must match this JSON schema:
${JSON.stringify(tool.input_schema)}`;

export async function callOpenAi(system: string, user: string, tool: ToolDef, effort: 'low' | 'medium' | 'high' = 'low'): Promise<unknown> {
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, 'missing_api_key', 'OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server.');
  try {
    return await metaAdsJson<unknown>(
      [{ role: 'system', content: withJsonShape(system, tool) }, { role: 'user', content: user }],
      // 'low' by default: fast and cheap; the rulebook in the prompt does the heavy lifting. The blueprint asks for 'medium'.
      { maxTokens: 12_000, timeoutMs: 120_000, model: OPENAI_SCRIPT_MODEL, reasoningEffort: effort, meter: createMeter(), label: `Script generator (${tool.name})` },
    );
  } catch (err) {
    throw new HttpError(502, 'openai_error', err instanceof Error ? err.message.slice(0, 200) : 'OpenAI call failed. Try again.');
  }
}
