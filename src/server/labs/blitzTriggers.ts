// server-only — never import from a 'use client' file.
// Triggers for the Blitz Script Bank: before its stories are written in parallel, one call picks what each story is
// about (a problem, a myth, a mistake, a doubt… as its format needs), all different, so two stories never tell the
// same thing with another object ("rice is gone" vs "sauce is gone").

import { chatJsonWithMeta } from '../ai/openai';
import type { WebsiteBrief } from '../slideshow/engines/website/engine';
import { FORMAT_DEFS, type StoryFormat } from './blitzFormats';

/** One trigger per format in `formats` (same order), none like `avoid`. Empty strings where the model gave none. */
export async function writeTriggers(brief: WebsiteBrief, formats: StoryFormat[], avoid: string[]): Promise<string[]> {
  if (formats.length === 0) return [];
  const b = brief.business;
  const prompt = `You plan short videos for ${brief.idc}, about the business below.

BUSINESS
- Name: ${b.name}
- What it is: ${b.promoting}
- Core promise: ${b.offer}
- What makes it different: ${b.positioning}
${b.description ? `- Description: ${b.description}\n` : ''}${brief.audienceDescription ? `- Typical customer: ${brief.audienceDescription}\n` : ''}${b.howToBuy ? `- How customers buy: ${b.howToBuy}\n` : ''}
TASK
Write one line per video below, in this order. Each line is what that video is about:
${formats.map((f, i) => `${i + 1}. ${FORMAT_DEFS[f].trigger}`).join('\n')}

Every line must be about a different situation with a different cause or cost: wasted money, lost time, stress, a
mistake, a missed chance, an argument, a worry. Never the same thing with another object or another moment.
Bad pair: "the rice is gone at dinner" and "the sauce is gone at dinner" (same problem).
${avoid.length ? `Already used, write nothing close to these:\n${avoid.map((a) => `- ${a}`).join('\n')}\n` : ''}
RULES
- One short sentence each, max 12 words, plain words, in ${brief.idc}'s own words.
- Only things that follow from the business above. No numbers.

OUTPUT: JSON only, exactly ${formats.length} lines. {"triggers": ["...", "..."]}`;
  const { result } = await chatJsonWithMeta<{ triggers?: unknown }>(
    [{ role: 'system', content: prompt }, { role: 'user', content: 'Write the JSON now.' }],
    { maxTokens: 3000, temperature: 0.8, model: 'gpt-5.5', reasoningEffort: 'low', timeoutMs: 45_000 },
  ).catch((err: unknown) => {
    console.error(`[BlitzTriggers:${brief.idc}] failed:`, err instanceof Error ? err.message : err);
    return { result: null };
  });
  const list = Array.isArray(result?.triggers) ? result.triggers : [];
  return formats.map((_, i) => (typeof list[i] === 'string' ? (list[i] as string).trim() : ''));
}
