// server-only — never import from a 'use client' file.
// Fallback for the Client types: used when the website names no client industry word for word. The model says who
// buys from this business. The result is a starting list with no quote behind it, and the owner can edit it.

import { chatJson } from '../ai/openai';
import { cleanIndustries } from '../../lib/customerIndustries';

const MAX_FALLBACK_TYPES = 3;

type FallbackInput = { businessName: string; promoting: string; description: string; geography: string; businessModel: string };

/** 1-3 plain client types for a business, or an empty list when the call fails. */
export async function inferClientTypes(input: FallbackInput): Promise<string[]> {
  try {
    const result = await chatJson<{ clientTypes?: unknown }>(
      [
        {
          role: 'system',
          content: `You name who buys from a business. Give 1 to ${MAX_FALLBACK_TYPES} client types, most important first.
Use plain words a shop owner would say: "homeowners", "property managers", "restaurants", "new mothers". Never use the business's own trade.
Stay with what the description says. Invent no facts. Each type is 1 to 4 words, lower case.
Return JSON only: { "clientTypes": ["..."] }`,
        },
        {
          role: 'user',
          content: `Business: ${input.businessName}\nSells: ${input.promoting}\nAbout: ${input.description}\nPlace: ${input.geography}\nModel: ${input.businessModel}`,
        },
      ],
      { maxTokens: 120, temperature: 0.2, model: 'gpt-4o-mini' },
    );
    const raw = Array.isArray(result?.clientTypes) ? result.clientTypes.filter((n): n is string => typeof n === 'string') : [];
    return cleanIndustries(raw).slice(0, MAX_FALLBACK_TYPES);
  } catch (err) {
    console.warn('[studio/profile] client types fallback failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
