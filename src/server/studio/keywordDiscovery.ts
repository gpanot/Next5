/**
 * Campaign Studio — TikTok search keyword discovery + relevance guardrail.
 *
 * Split out of profileExtractor.ts. Two responsibilities:
 *  1. discoverKeywords — generate 4 TikTok search queries for the client's real-world niche.
 *  2. validateKeywordRelevance — a second, independent LLM pass that checks each generated
 *     query against the business's own description before it is trusted. This is the backstop
 *     against exactly the failure mode that shipped wrong content for a B2B SaaS site: an LLM
 *     asked to write about a niche it has no real signal for will invent one (e.g. "fitness
 *     studio", "healthcare tips") instead of erroring. Vertical-pack keywords are curated and
 *     skip this check; only LLM-generated queries are verified.
 */
// server-only
import { chatJson } from '../ai/openai';
import { getVerticalPack } from './verticalPacks';

// ─── Discovery ──────────────────────────────────────────────────────────────

export type DiscoverKeywordsInput = {
  businessName: string;
  vertical: string;
  audienceType: string;
  /** What the business sells / does, 1 sentence. Grounds the LLM call in real evidence. */
  promoting: string;
  targetCustomerIndustries: string[];
};

/** Generate TikTok search keywords with GPT-4o-mini.
 * For B2B vendors, generates queries from the IDC (target customer) industries so TikTok
 * research finds content relevant to the END CUSTOMER (e.g. "mechanic scheduling tips"),
 * not generic content about the vendor's own vertical (e.g. "saas tips").
 */
export async function discoverKeywords(input: DiscoverKeywordsInput): Promise<{ keywords: string[]; durationMs: number; verified: boolean }> {
  const t0 = Date.now();
  const { businessName, vertical, audienceType, promoting, targetCustomerIndustries } = input;
  const pack = getVerticalPack(vertical);

  // A B2B vendor with no extracted end-customer industries has no real TikTok
  // niche to search — its own vertical (e.g. "saas") is not a real-world
  // audience, and handing it to the LLM as one directly contradicts the "don't
  // generate queries about software/apps" rule below, which reliably produced
  // hallucinated, unrelated niches (e.g. "fitness studio", "healthcare tips")
  // instead of an error. Same problem when the crawl was too thin to classify
  // a real vertical at all ("generic"). In both cases, use the curated,
  // on-topic fallback list instead of asking the LLM to invent an audience.
  if (targetCustomerIndustries.length === 0 && (audienceType === 'b2b' || vertical === 'generic')) {
    const fallbackKeywords = pack.researchKeywords.slice(0, 4);
    console.log(`[studio/profile] discoverKeywords → no target customer industries (audienceType=${audienceType}, vertical=${vertical}); using vertical pack: ${JSON.stringify(fallbackKeywords)}`);
    return { keywords: fallbackKeywords, durationMs: Date.now() - t0, verified: true };
  }

  const niches = targetCustomerIndustries.length > 0 ? targetCustomerIndustries : [vertical];

  console.log(`[studio/profile] discoverKeywords LLM call for niches=${JSON.stringify(niches)}`);

  try {
    const result = await chatJson<{ queries?: unknown[] }>(
      [
        {
          role: 'system',
          content: `Generate 4 TikTok search queries to find viral content made BY or FOR small business owners in these industries.
Rules:
- Each query should be 2-4 words that real TikTok creators would use.
- Focus on the TARGET CUSTOMER's daily challenges, business tips, and how they run their business.
- Do NOT generate queries about software, apps, or technology — focus on the industry itself.
- The industries given below are the ONLY topics you may write about. Never substitute a different industry, even if you are unsure — if nothing fits, reuse the given industry name as-is in the query.
- Examples for "electricians": ["electrician business tips", "electrical contractor advice", "tradie productivity", "small electrical business"]
Return JSON only: { "queries": ["query 1", "query 2", "query 3", "query 4"] }`,
        },
        {
          role: 'user',
          content: `Business: ${businessName}
What they sell: ${promoting || 'unknown'}
Target customer industries (the only allowed topics): ${niches.join(', ')}`,
        },
      ],
      { maxTokens: 100, temperature: 0.2, model: 'gpt-4o-mini' },
    );

    const raw = Array.isArray(result?.queries) ? result.queries : [];
    const generated = raw
      .filter((q): q is string => typeof q === 'string' && q.trim().length > 2)
      .map((q) => q.trim().toLowerCase())
      .slice(0, 4);

    if (generated.length > 0) {
      const { keywords, verified } = await validateKeywordRelevance(generated, { businessName, promoting, niches, pack });
      console.log(`[studio/profile] discoverKeywords → ${JSON.stringify(keywords)} (verified=${verified}) in ${Date.now() - t0}ms`);
      return { keywords, durationMs: Date.now() - t0, verified };
    }
  } catch (err) {
    console.error('[studio/profile] discoverKeywords LLM failed, using fallback:', err);
  }

  // Fallback: construct directly from niche names
  const fallback = niches.slice(0, 4).map((n) => `${n} tips`);
  console.log(`[studio/profile] discoverKeywords fallback → ${JSON.stringify(fallback)} in ${Date.now() - t0}ms`);
  return { keywords: fallback, durationMs: Date.now() - t0, verified: false };
}

// ─── Relevance guardrail ────────────────────────────────────────────────────

type ValidationContext = {
  businessName: string;
  promoting: string;
  niches: string[];
  pack: ReturnType<typeof getVerticalPack>;
};

/**
 * Second, independent LLM pass: checks each generated query is plausibly a real TikTok
 * search topic for THIS business's actual customers, not an invented unrelated niche.
 * Any query that fails is dropped and backfilled from the vertical pack so the caller
 * always gets back up to 4 keywords. Runs one call for all queries (not one per query)
 * to keep cost and latency down.
 */
async function validateKeywordRelevance(
  queries: string[],
  ctx: ValidationContext,
): Promise<{ keywords: string[]; verified: boolean }> {
  try {
    const result = await chatJson<{ checks?: Array<{ query?: string; relevant?: boolean }> }>(
      [
        {
          role: 'system',
          content: `You check whether TikTok search queries are actually relevant to a business's real customers.
A query is RELEVANT only if its topic matches the business description or target industries given — same industry, same type of customer.
A query about a completely different industry (e.g. "fitness" or "healthcare" queries for a business that has nothing to do with fitness or healthcare) is NOT relevant, even if it's a plausible TikTok niche in general.
Return JSON only: { "checks": [{ "query": "...", "relevant": true|false }, ...] } — one entry per input query, same order.`,
        },
        {
          role: 'user',
          content: `Business: ${ctx.businessName}
What they sell: ${ctx.promoting || 'unknown'}
Target industries: ${ctx.niches.join(', ')}

Queries to check:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
        },
      ],
      { maxTokens: 200, temperature: 0, model: 'gpt-4o-mini' },
    );

    const checks = Array.isArray(result?.checks) ? result.checks : [];
    if (checks.length === 0) {
      // chatJson returns null (never throws) on any failure — including this call
      // returning no usable data. That is NOT the same as "everything checked out";
      // claiming verified here would let a validation outage silently pass through
      // hallucinated queries with a false "verified" badge.
      console.error('[studio/profile] validateKeywordRelevance got no checks back, passing queries through unverified');
      return { keywords: queries, verified: false };
    }

    const relevant = queries.filter((q, i) => {
      // Match by index first (model asked to preserve order); fall back to text match.
      const byIndex = checks[i];
      if (byIndex && typeof byIndex.relevant === 'boolean') return byIndex.relevant;
      const byText = checks.find((c) => c.query?.trim().toLowerCase() === q);
      return byText?.relevant ?? true; // no per-item verdict found — do not silently drop this one
    });

    if (relevant.length === queries.length) {
      // Everything passed — nothing to backfill.
      return { keywords: queries, verified: true };
    }

    console.warn(`[studio/profile] discoverKeywords → rejected ${queries.length - relevant.length}/${queries.length} off-topic queries: ${JSON.stringify(queries.filter((q) => !relevant.includes(q)))}`);

    const backfill = ctx.pack.researchKeywords.filter((k) => !relevant.includes(k));
    const keywords = [...relevant, ...backfill].slice(0, 4);
    return { keywords: keywords.length > 0 ? keywords : ctx.pack.researchKeywords.slice(0, 4), verified: true };
  } catch (err) {
    // Validation call itself failed (network/timeout) — do not block the pipeline on it,
    // but do not silently trust unverified output either; the caller records `verified: false`.
    console.error('[studio/profile] validateKeywordRelevance failed, passing queries through unverified:', err);
    return { keywords: queries, verified: false };
  }
}
