// server-only — never import from a 'use client' file.
// Portrait Clone: turns a character image into one exhaustively locked JSON prompt.
// System prompt is the full skill; a code check then enforces its self-check and asks for one repair.

import { openRouterChat, parseJsonObject, type OpenRouterMessage } from '../ai/openrouter';
import { checkPortraitJson } from './portraitCloneCheck';
import { PORTRAIT_CLONE_SKILL } from './portraitCloneSkill';

/** Vision model via OpenRouter. */
export const PORTRAIT_CLONE_MODEL = 'google/gemini-3.5-flash-lite';
const MAX_TOKENS = 16_000;
/** Fixed seed and low temperature: the same image should give the same JSON. */
const SEED = 20260911;
const TEMPERATURE = 0.1;
const CALL_TIMEOUT_MS = 50_000;

/** Output rules for this app on top of the skill: raw JSON (no fence) so response_format works. */
const APP_RULES =
  '\n\n## Output for this app\nReturn the JSON object only, with no code fence and no text around it. ' +
  'The video will be vertical 9:16, but describe the reference image as it is.';

export type PortraitCloneResult = {
  json: Record<string, unknown>;
  /** Problems the first draft had (sent back for repair). */
  issuesFound: string[];
  /** Problems still present in the returned JSON. */
  issuesLeft: string[];
};

const ask = async (messages: OpenRouterMessage[]) =>
  parseJsonObject(
    await openRouterChat(messages, {
      model: PORTRAIT_CLONE_MODEL, maxTokens: MAX_TOKENS, temperature: TEMPERATURE, seed: SEED, timeoutMs: CALL_TIMEOUT_MS,
    }),
  );

const repairRequest = (issues: string[]): string =>
  [
    'Your JSON fails the skill self-check. Fix every issue below, re-check the whole JSON against the skill,',
    'and return the complete corrected JSON with the prompt_id version bumped. Issues:',
    ...issues.map((i) => `- ${i}`),
  ].join('\n');

/**
 * Analyses one character image and returns the locked portrait JSON, or null when the model fails.
 * Runs at most two model calls: the draft, then one repair if the check finds issues.
 */
export const generatePortraitJson = async (imageUrl: string, name: string): Promise<PortraitCloneResult | null> => {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: PORTRAIT_CLONE_SKILL + APP_RULES },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: `Reference image attached. Use "${name}" as the prompt_id base. Return the full locked JSON.` },
      ],
    },
  ];
  const draft = await ask(messages);
  if (!draft) return null;

  const issuesFound = checkPortraitJson(draft);
  if (issuesFound.length === 0) return { json: draft, issuesFound, issuesLeft: [] };

  const repaired = await ask([
    ...messages,
    { role: 'assistant', content: JSON.stringify(draft) },
    { role: 'user', content: repairRequest(issuesFound) },
  ]);
  const json = repaired ?? draft;
  return { json, issuesFound, issuesLeft: checkPortraitJson(json) };
};
