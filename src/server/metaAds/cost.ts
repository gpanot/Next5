// server-only — never import from a 'use client' file.
// Cost per pipeline step. OpenAI is priced from the tokens each response reports; the rest from rate cards.

import type { CostItem, StepCost } from '../../types/admin/metaAds';

/** OpenAI list prices, micro-USD per token (checked 2026-09-28, developers.openai.com/api/docs/models). */
const OPENAI_PRICES: Record<string, { input: number; output: number }> = {
  'gpt-5.4-nano': { input: 0.2, output: 1.25 },
  'gpt-5.4-mini': { input: 0.75, output: 4.5 },
  'gpt-5.5': { input: 5, output: 30 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

/** ScrapeCreators Ad Library search via treg: 1 credit per page. */
export const AD_LIBRARY_PAGE_MICROS = 1_880;
/** Exa /contents with livecrawl, one page. */
export const EXA_PAGE_MICROS = 1_000;

export const openAiCostMicros = (model: string, promptTokens: number, completionTokens: number): number => {
  const price = OPENAI_PRICES[model] ?? OPENAI_PRICES[model.replace(/-\d{4}-\d{2}-\d{2}$/, '')];
  return price ? Math.round(promptTokens * price.input + completionTokens * price.output) : 0;
};

/** Collects the line items of one step. Steps run their calls in parallel, so items are appended as they finish. */
export type CostMeter = {
  add: (label: string, usdMicros: number) => void;
  summary: () => StepCost;
};

export const createMeter = (): CostMeter => {
  const items: CostItem[] = [];
  return {
    add: (label, usdMicros) => {
      if (usdMicros > 0) items.push({ label, usdMicros });
    },
    summary: () => {
      // Same label = same kind of call: merge them into one line with a count.
      const merged = new Map<string, { usdMicros: number; count: number }>();
      for (const item of items) {
        const row = merged.get(item.label) ?? { usdMicros: 0, count: 0 };
        merged.set(item.label, { usdMicros: row.usdMicros + item.usdMicros, count: row.count + 1 });
      }
      const lines = [...merged.entries()].map(([label, row]) => ({ label: row.count > 1 ? `${label} ×${row.count}` : label, usdMicros: row.usdMicros }));
      return { usdMicros: lines.reduce((sum, line) => sum + line.usdMicros, 0), items: lines };
    },
  };
};
