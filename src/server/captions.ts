// server-only — never import from a 'use client' file.

import { INDUSTRIES } from '../content/business/catalog/types';
import { isMockGeneration } from '../lib/mock';

export type CaptionInput = { industry: string | null; themeTitle: string; sceneLabel: string; businessName: string; handle: string | null };

const fallback = (input: CaptionInput): string =>
  `${input.themeTitle} — ${input.sceneLabel.toLowerCase()}. Message ${input.handle ?? input.businessName} to find out more.`;

/** One short, ready-to-post English caption (≤ 280 chars, 0–3 hashtags, no emoji). */
export const generateCaption = async (input: CaptionInput): Promise<string> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || isMockGeneration()) return fallback(input);
  const industry = INDUSTRIES.find((i) => i.id === input.industry)?.label ?? 'small business';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 120,
        messages: [
          { role: 'system', content: 'You write short social media captions for professionals. American English, warm and confident, 1-2 sentences, max 240 characters, then up to 3 relevant hashtags. No emoji, no quotation marks, never mention AI or photos being generated, never invent facts (prices, awards, sales, addresses).' },
          { role: 'user', content: `Business: ${input.businessName} (${industry}). Post theme: ${input.themeTitle}. Photo scene: ${input.sceneLabel}. Write the caption.` },
        ],
      }),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 280) : fallback(input);
  } catch {
    return fallback(input);
  } finally {
    clearTimeout(timer);
  }
};
