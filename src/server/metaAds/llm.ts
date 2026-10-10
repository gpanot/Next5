// server-only — never import from a 'use client' file.

import { chatJsonWithMeta, type ChatMessage } from '../ai/openai';
import { openAiCostMicros, type CostMeter } from './cost';
import { wellFormed } from './text';

/**
 * The model for every text step. GPT-5 family models take `max_completion_tokens` and reject a custom temperature,
 * so they get their own request; anything else goes through the shared chatJsonWithMeta helper.
 */
export const META_ADS_MODEL = process.env.META_ADS_MODEL ?? 'gpt-5.4-nano';

/** GPT-5 and later (gpt-6.1-sol since 2026-10-10) and the o-series. */
const isReasoningModel = (model: string): boolean => /^(gpt-([5-9]|\d{2})|o\d)/.test(model);

type Usage = { promptTokens: number; completionTokens: number };

type Options = {
  maxTokens: number;
  timeoutMs?: number;
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  /** Records the call's cost on the step's meter under `label`. */
  meter?: CostMeter;
  label?: string;
};

const reasoningJson = async <T>(messages: ChatMessage[], model: string, options: Options): Promise<{ result: T; usage: Usage | null }> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_completion_tokens: options.maxTokens,
      reasoning_effort: options.reasoningEffort ?? 'low',
      response_format: { type: 'json_object' },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${model} (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const choice = data.choices?.[0];
  if (!choice?.message?.content) throw new Error(`OpenAI ${model} returned no content (finish_reason=${choice?.finish_reason ?? 'unknown'})`);
  const usage = data.usage ? { promptTokens: data.usage.prompt_tokens ?? 0, completionTokens: data.usage.completion_tokens ?? 0 } : null;
  return { result: JSON.parse(choice.message.content) as T, usage };
};

/** Every text part made valid Unicode: prompts are built from sliced ad copy, where a cut emoji breaks the request. */
const sanitize = (messages: ChatMessage[]): ChatMessage[] =>
  messages.map((m) => ({
    ...m,
    content: typeof m.content === 'string' ? wellFormed(m.content) : m.content.map((part) => (part.type === 'text' ? { ...part, text: wellFormed(part.text) } : part)),
  }));

/** One JSON completion. Throws on failure so the pipeline records which step broke and why. */
export const metaAdsJson = async <T>(rawMessages: ChatMessage[], options: Options): Promise<T> => {
  const messages = sanitize(rawMessages);
  const model = options.model ?? META_ADS_MODEL;
  let result: T;
  let usage: Usage | null;
  if (isReasoningModel(model)) {
    ({ result, usage } = await reasoningJson<T>(messages, model, options));
  } else {
    const out = await chatJsonWithMeta<T>(messages, { maxTokens: options.maxTokens, timeoutMs: options.timeoutMs ?? 90_000, model });
    if (!out.result) throw new Error(`OpenAI ${model} returned no usable JSON`);
    result = out.result;
    usage = out.meta.usage;
  }
  if (options.meter && usage) options.meter.add(options.label ?? `OpenAI ${model}`, openAiCostMicros(model, usage.promptTokens, usage.completionTokens));
  return result;
};
