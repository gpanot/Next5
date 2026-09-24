/**
 * Campaign Studio — TikTok search keyword discovery + relevance guardrail.
 *
 * Split out of profileExtractor.ts. Two responsibilities:
 *  1. discoverKeywords — up to 3 plain TikTok search terms for the client's real-world niche.
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
import type { StudioProfileData } from './types';

// ─── Discovery ──────────────────────────────────────────────────────────────

export type DiscoverKeywordsInput = {
  businessName: string;
  vertical: string;
  audienceType: string;
  /** What the business sells / does, 1 sentence. Grounds the LLM call in real evidence. */
  promoting: string;
  targetCustomerIndustries: string[];
};

/**
 * Keyword inputs derived from a saved profile. Extraction and research both build inputs
 * through this, so their signatures match and edits to any input field are detected.
 */
export function keywordInputFromProfile(p: StudioProfileData): DiscoverKeywordsInput {
  const idc = p.market.targetCustomerIndustries;
  // Profiles saved before evidence grounding carry LLM-padded industries with no evidence
  // (e.g. "beauty salons" for a mechanics-only booking tool). Ignore those; manual edits stay.
  const idcTrusted = idc && (idc.source === 'manual' || Array.isArray(idc.evidence));
  return {
    businessName: p.identity.businessName.value,
    vertical: p.classification.vertical.value,
    audienceType: p.classification.businessModel.value === 'b2b' ? 'b2b' : 'b2c',
    promoting: p.positioning.promoting.value,
    targetCustomerIndustries: idcTrusted ? idc.value : [],
  };
}

/** Stored on the keywords envelope; a mismatch means the keywords are stale. */
export function keywordInputSignature(input: DiscoverKeywordsInput): string {
  return [
    'kw:v2', // v2 = plain niche search terms (Blitz-style), replacing v1 "business tips" phrases
    input.vertical,
    input.audienceType,
    input.promoting.trim().toLowerCase(),
    input.targetCustomerIndustries.map((i) => i.trim().toLowerCase()).join(','),
  ].join('|');
}

/** Max search terms per run — matches the research step's keyword budget. */
const MAX_TERMS = 3;

/**
 * Words that turn a niche search into generic business-coach content. "auto mechanic" returns
 * mechanics filming their work; "mechanic business advice" returns coaches who also post for
 * salons and gyms — which is how off-topic videos got into research.
 */
const FILLER = /\b(tips?|advice|business(es)?|marketing|growth|strateg(y|ies)|management|challenges?|ideas?|success|small|hacks?|insights?)\b/g;

export function toSearchTerm(raw: string): string {
  return raw.toLowerCase().replace(FILLER, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueTerms(raw: string[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const t = toSearchTerm(r);
    if (t.length >= 3 && !out.includes(t)) out.push(t);
  }
  return out.slice(0, MAX_TERMS);
}

/**
 * TikTok search terms for the research step — plain niche names, the way the Blitz researcher
 * is used ("auto mechanic" → 10 videos made by mechanics).
 *
 * - B2B with target customer industries: the industries ARE the search terms. They are either
 *   evidence-grounded or typed by the admin, so no LLM step — nothing can be invented here.
 * - B2B without them: no terms — research asks the admin for the niches instead of guessing.
 * - No usable vertical: the curated vertical-pack list.
 * - B2C: the LLM names the business's own trade from "what they sell", then a second pass
 *   checks each term against the business before it is trusted. If nothing passes, no terms.
 */
export async function discoverKeywords(input: DiscoverKeywordsInput): Promise<{ keywords: string[]; durationMs: number; verified: boolean }> {
  const t0 = Date.now();
  const { businessName, vertical, audienceType, promoting, targetCustomerIndustries } = input;
  const pack = getVerticalPack(vertical);

  if (targetCustomerIndustries.length > 0) {
    const keywords = uniqueTerms(targetCustomerIndustries);
    if (keywords.length > 0) {
      console.log(`[studio/profile] discoverKeywords → target customer industries as search terms: ${JSON.stringify(keywords)}`);
      return { keywords, durationMs: Date.now() - t0, verified: true };
    }
  }

  // A B2B vendor's own vertical ("saas" → "software review") is not its customers' niche.
  // Without evidenced customer industries there is nothing correct to search, so return none
  // and let the research step ask the admin for them.
  if (audienceType === 'b2b') {
    console.log('[studio/profile] discoverKeywords → B2B with no target customer industries; no search terms');
    return { keywords: [], durationMs: Date.now() - t0, verified: true };
  }

  if (vertical === 'generic' || !promoting) {
    const keywords = pack.researchKeywords.slice(0, MAX_TERMS);
    console.log(`[studio/profile] discoverKeywords → no niche signal (audienceType=${audienceType}, vertical=${vertical}); vertical pack: ${JSON.stringify(keywords)}`);
    return { keywords, durationMs: Date.now() - t0, verified: true };
  }

  console.log(`[studio/profile] discoverKeywords LLM call for "${promoting}"`);
  try {
    const result = await chatJson<{ terms?: unknown[] }>(
      [
        {
          role: 'system',
          content: `Name the trade this business is in, as TikTok search terms that find videos made by people who do this work.
Rules:
- 1 to 3 terms, each 1-3 words: the plain name of the trade, the business type, or the person who does the work, as someone would type it into TikTok search.
- Pick terms whose videos are made BY businesses like this one. Avoid bare product or food words ("breakfast", "lunch", "pizza") — those return home cooks and shoppers, not businesses.
- For a brand selling products online, name the product category the brand is known for.
- Use only what "What they sell" says. Never name a different trade.
- No add-on words: no "tips", "advice", "business", "marketing", "growth", "ideas".
- Examples: an auto repair shop → ["auto repair", "mechanic"]; a chiropractic clinic → ["chiropractor"]; a day spa → ["day spa", "massage therapist"]; a family diner → ["diner owner", "family restaurant"]; an acne skincare brand → ["acne skincare"].
Return JSON only: { "terms": ["...", "..."] }`,
        },
        { role: 'user', content: `Business: ${businessName}\nWhat they sell: ${promoting}` },
      ],
      { maxTokens: 60, temperature: 0.1, model: 'gpt-4o-mini' },
    );

    const raw = Array.isArray(result?.terms) ? result.terms.filter((q): q is string => typeof q === 'string') : [];
    const generated = uniqueTerms(raw);
    if (generated.length > 0) {
      const { keywords, verified } = await validateKeywordRelevance(generated, { businessName, promoting, niches: [promoting], pack });
      console.log(`[studio/profile] discoverKeywords → ${JSON.stringify(keywords)} (verified=${verified}) in ${Date.now() - t0}ms`);
      return { keywords, durationMs: Date.now() - t0, verified };
    }
  } catch (err) {
    console.error('[studio/profile] discoverKeywords LLM failed, using vertical pack:', err);
  }

  // Same reason as the guardrail: a pack guess can be the wrong trade. Research asks instead.
  console.log(`[studio/profile] discoverKeywords → no verified terms in ${Date.now() - t0}ms`);
  return { keywords: [], durationMs: Date.now() - t0, verified: false };
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
 * Any query that fails is dropped (never refilled). Runs one call for all queries (not one
 * per query) to keep cost and latency down.
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

    // No backfill: a vertical pack is broader than one business (health_wellness covers both
    // dentists and chiropractors), so refilling put "chiropractor tips" on a dental practice.
    // Fewer, correct terms beat a full list; zero terms makes research ask the admin.
    return { keywords: relevant, verified: true };
  } catch (err) {
    // Validation call itself failed (network/timeout) — do not block the pipeline on it,
    // but do not silently trust unverified output either; the caller records `verified: false`.
    console.error('[studio/profile] validateKeywordRelevance failed, passing queries through unverified:', err);
    return { keywords: queries, verified: false };
  }
}
