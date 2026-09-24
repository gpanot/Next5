/**
 * Campaign Studio — competitor discovery.
 * Search-based, not LLM memory: an LLM asked to recall competitors from training data
 * routinely returns companies in the wrong category (e.g. real-estate marketing tools for a
 * general booking-software vendor) with no way to catch the mistake. Exa /search grounds the
 * candidate list in real, current search results; a validation pass then keeps only the
 * candidates that actually match the client's offer type and audience.
 */
// server-only
import { chatJson } from '../ai/openai';
import { exaFetch, type ExaSearchResponse } from './exa';

export type FindCompetitorsInput = {
  businessName: string;
  /** What the business sells / does — used to build the search query. */
  promoting: string;
  geography: string;
  sourceUrl: string;
};

export type FindCompetitorsResult = {
  competitors: string[];
  durationMs: number;
  exaCalls: number;
  costUsdMicros: number;
};

/** Exa /search category=company: ~$0.007/call observed. Rough, for run-cost telemetry only. */
const EXA_SEARCH_COST_MICROS = 7_000;
/** gpt-4o-mini validation call: ~$0.0003/call, same order as the research classify call. */
const VALIDATE_COST_MICROS = 300;

function ownDomain(sourceUrl: string): string | null {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Search Exa for real, current companies in the same space, then LLM-validate the shortlist. */
export async function findCompetitors(input: FindCompetitorsInput): Promise<FindCompetitorsResult> {
  const t0 = Date.now();
  const { businessName, promoting, geography, sourceUrl } = input;
  const domain = ownDomain(sourceUrl);
  const query = geography ? `${promoting || businessName} in ${geography}` : promoting || businessName;

  console.log(`[studio/competitors] Exa /search category=company query="${query}"`);
  const searchResult = await exaFetch<ExaSearchResponse>('/search', {
    query,
    type: 'auto',
    category: 'company',
    numResults: 6,
    ...(domain ? { excludeDomains: [domain] } : {}),
    contents: { highlights: true },
  });
  let exaCalls = 1;

  let candidates = (searchResult?.results ?? []).filter((r) => r.title && r.url);

  // Category-constrained search can come back empty for a niche/local business — retry once
  // without the category restriction before giving up on search entirely.
  if (candidates.length === 0) {
    console.log('[studio/competitors] no company-category results, retrying plain search');
    const retry = await exaFetch<ExaSearchResponse>('/search', {
      query: `${query} competitors alternatives`,
      type: 'auto',
      numResults: 6,
      ...(domain ? { excludeDomains: [domain] } : {}),
      contents: { highlights: true },
    });
    exaCalls += 1;
    candidates = (retry?.results ?? []).filter((r) => r.title && r.url);
  }

  if (candidates.length === 0) {
    console.warn('[studio/competitors] Exa search returned nothing — leaving competitors empty rather than guessing from LLM memory');
    return { competitors: [], durationMs: Date.now() - t0, exaCalls, costUsdMicros: exaCalls * EXA_SEARCH_COST_MICROS };
  }

  const competitors = await validateCandidates(businessName, promoting, candidates);
  console.log(`[studio/competitors] validated competitors: ${JSON.stringify(competitors)} in ${Date.now() - t0}ms`);
  return {
    competitors,
    durationMs: Date.now() - t0,
    exaCalls,
    costUsdMicros: exaCalls * EXA_SEARCH_COST_MICROS + VALIDATE_COST_MICROS,
  };
}

type Candidate = { title?: string; url?: string; highlights?: string[] };

async function validateCandidates(businessName: string, promoting: string, candidates: Candidate[]): Promise<string[]> {
  const listing = candidates
    .map((c, i) => `${i + 1}. ${c.title} (${c.url})${c.highlights?.length ? ` — ${c.highlights[0]!.slice(0, 140)}` : ''}`)
    .join('\n');

  const result = await chatJson<{ competitors?: unknown[] }>(
    [
      {
        role: 'system',
        content: `You are given real search results for companies that may compete with a business. Keep only the ones that genuinely share the same offer type and target audience — drop anything in a different category, even if it's a well-known brand.
Return clean brand names only (e.g. "Calendly", not "Calendly | Scheduling Software").
Return at most 3. Return fewer than 3, or an empty list, if fewer genuinely match — do not pad with a weak match just to reach 3.
Return JSON only: { "competitors": ["Brand A", "Brand B", "Brand C"] }`,
      },
      { role: 'user', content: `Business: ${businessName}\nWhat they sell: ${promoting || 'unknown'}\n\nCandidates:\n${listing}` },
    ],
    { maxTokens: 80, temperature: 0.1, model: 'gpt-4o-mini' },
  );

  const raw = Array.isArray(result?.competitors) ? result.competitors : [];
  return raw
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim())
    .slice(0, 3);
}
