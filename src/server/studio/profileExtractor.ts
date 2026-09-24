/**
 * Campaign Studio v1 — Profile extraction.
 * Crawls the client's website via Exa /contents, infers brand identity and market position
 * with GPT-4o-mini, and returns a fully-populated StudioProfileData.
 *
 * This is a pure function: no DB writes. The caller (route handler) persists the result.
 */
// server-only
import { chatJson } from '../ai/openai';
import type { ExtractTelemetry, FieldEnvelope, StudioProfileData, StageMetrics } from './types';
import { KNOWN_VERTICALS } from './verticalPacks';
import { crawlSite } from './siteCrawl';
import { findCompetitors } from './competitors';
import { discoverKeywords, keywordInputSignature } from './keywordDiscovery';
import { groundIndustries } from './grounding';
import { classifyVertical } from './verticalClassifier';

/** Dedicated vertical call (verticalClassifier.ts): ~$0.0001. */
const VERTICAL_COST_MICROS = 100;

// ─── LLM profile inference ────────────────────────────────────────────────────

const KNOWN_VERTICALS_LIST = KNOWN_VERTICALS.join(', ');

/** Menu labels + homepage + up to 3 pages (see siteCrawl.ts), ~3k tokens. */
const MAX_INFER_CHARS = 12_000;

const INFER_SYSTEM_PROMPT = `You read a business website (its menu links, homepage, and a few key pages) and extract a structured brand profile for a social-media content tool. This must work correctly for ANY small business — a local auto repair shop, a chiropractor, a day spa, a B2B SaaS vendor, a restaurant, an ecommerce brand — not just the examples given.

Rules:
- Invent NOTHING. If you cannot determine a field, use "" or null.
- audienceType: "b2c" (sells to consumers), "b2b" (sells to businesses), or "both".
- vertical: one of [${KNOWN_VERTICALS_LIST}] or "generic". Pick the closest real match — e.g. an auto repair shop or mechanic is "automotive", a chiropractor/dentist/physical therapist is "health_wellness", a day spa/salon/massage studio is "beauty_spa". It describes what THIS business itself is, never its customers: software sold to mechanics is "saas", not "automotive"; a brand selling physical products online (skincare, supplements, apparel) is "ecommerce", not "beauty_spa". Only use "generic" when nothing plausibly fits.
- subVertical: a short label (e.g. "luxury residential", "SaaS HR tools", "auto body & collision"). Max 3 words.
- businessModel: "b2c", "b2b", or "d2c".
- promoting: max 15 words. What the business is, including WHO it serves (e.g. "Booking software for electricians and mechanics").
- offer: max 15 words. The core value proposition.
- positioning: max 20 words. Key differentiator.
- geography: city/region/country served, or "global". Max 10 words. "" if unclear.
- tagline: the actual tagline from the homepage, or "".
- audienceDescription: who the typical customer is, max 20 words.
- targetCustomerIndustries: CRITICAL for B2B — the specific industry niches this business sells TO, as shown ON THIS PAGE. These are the END CUSTOMER industries, not the vendor's own.
  Each item is an object: { "industry": "auto mechanics", "evidence": "<exact words copied from the page that name this industry>" }.
  The evidence must be copied verbatim from the text and must itself mention the industry (e.g. "Owner at Nash Street Mechanical" for "auto mechanics"). A generic phrase like "service-based businesses" is NOT evidence for any specific industry.
  Only list industries the page actually evidences. Do NOT add industries that a business like this "usually" serves — if the page only evidences one industry, return one item.
  Best sources: the "Site menu and links" section (e.g. an "Industries" menu listing "Mechanics", "Electricians" — quote the menu label as evidence), industry pages, testimonials, case studies, client logos, "trusted by" sections, "built for X" statements.
  Write plain-English industry names (e.g. "auto mechanics", never "automotive"). NEVER reuse a value from the "vertical" list above.
  Empty array [] if B2C, or if no industry is evidenced. Max 5 items.
- tone: one of [casual, casual_professional, professional, witty, authoritative, friendly].
- suggestedHooks: 2–3 hook patterns for TikTok written for the END CUSTOMER (the IDC), each 5–10 words.

Return valid JSON only (no markdown):
{
  "businessName": "...",
  "tagline": "...",
  "description": "...",
  "audienceType": "b2c|b2b|both",
  "vertical": "...",
  "subVertical": "...",
  "businessModel": "b2c|b2b|d2c",
  "promoting": "...",
  "offer": "...",
  "positioning": "...",
  "geography": "...",
  "audienceDescription": "...",
  "targetCustomerIndustries": [{ "industry": "...", "evidence": "..." }],
  "tone": "...",
  "suggestedHooks": ["...", "..."]
}`;

/** Token cost in micros for gpt-4o-mini (approximate).
 * Formula: tokens × ($/1M) = micros  (1 micro = $0.000001; $0.15/1M tokens = 0.15 micros/token)
 */
function inferCostMicros(inputTokens: number, outputTokens: number): number {
  // gpt-4o-mini: $0.15/1M input, $0.60/1M output
  // micros = tokens × rate  (no extra /1_000 — that was cancelling the unit conversion)
  return Math.round(inputTokens * 0.15 + outputTokens * 0.60);
}

type InferResult = {
  businessName?: string;
  tagline?: string;
  description?: string;
  audienceType?: string;
  vertical?: string;
  subVertical?: string;
  businessModel?: string;
  promoting?: string;
  offer?: string;
  positioning?: string;
  geography?: string;
  audienceDescription?: string;
  targetCustomerIndustries?: unknown[];
  tone?: string;
  suggestedHooks?: unknown[];
};

async function inferProfile(text: string, url: string): Promise<{ result: InferResult; durationMs: number; costMicros: number }> {
  console.log(`[studio/profile] LLM infer → gpt-4o-mini (${text.length} chars crawled from ${url})`);
  const t0 = Date.now();

  // Estimate tokens (rough: 1 token ≈ 4 chars)
  const inputTokens = Math.round((INFER_SYSTEM_PROMPT.length + text.length) / 4);
  const outputTokens = 400;

  const result = await chatJson<InferResult>(
    [
      { role: 'system', content: INFER_SYSTEM_PROMPT },
      { role: 'user', content: text.slice(0, MAX_INFER_CHARS) },
    ],
    { maxTokens: 600, temperature: 0.2, model: 'gpt-4o-mini' },
  );

  const durationMs = Date.now() - t0;
  const costMicros = inferCostMicros(inputTokens, outputTokens);
  console.log(`[studio/profile] LLM infer OK in ${durationMs}ms costMicros=${costMicros} vertical="${result?.vertical}" targetCustomerIndustries=${JSON.stringify(result?.targetCustomerIndustries ?? [])}`);
  return { result: result ?? {}, durationMs, costMicros };
}

// ─── Validation helpers ────────────────────────────────────────────────────────

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function envelope<T>(value: T, source: 'crawl' | 'inferred', confidence: number): FieldEnvelope<T> {
  return { value, source, confidence, locked: false };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export type ExtractProfileInput = {
  sourceUrl: string;
  /** Admin can pass a hint to override the LLM classification. */
  verticalHint?: string;
};

export type ExtractProfileResult = {
  data: StudioProfileData;
  telemetry: ExtractTelemetry;
};

/**
 * Extracts a full brand profile from the given URL.
 * Cost: ~$0.01–$0.02 per run (Exa crawl + competitor search + LLM inference/validation).
 */
export async function extractProfile(input: ExtractProfileInput): Promise<ExtractProfileResult> {
  console.log(`[studio/profile] extractProfile START url=${input.sourceUrl}`);
  const zeroStage: StageMetrics = { durationMs: 0, costUsdMicros: 0 };

  // ── Stage 1: crawl ─────────────────────────────────────────────────────────
  const crawlResult = await crawlSite(input.sourceUrl);
  const crawlStage: StageMetrics = { durationMs: crawlResult.durationMs, costUsdMicros: crawlResult.costUsdMicros };

  if (!crawlResult.text) {
    // Fallback: return placeholder profile — admin will fill manually
    const hostname = (() => { try { return new URL(input.sourceUrl).hostname.replace(/^www\./, ''); } catch { return input.sourceUrl; } })();
    return {
      data: buildPlaceholder(hostname),
      telemetry: { stages: { crawl: crawlStage, infer: zeroStage, competitors: zeroStage, keywords: zeroStage }, totalDurationMs: crawlResult.durationMs, totalCostUsdMicros: crawlResult.costUsdMicros },
    };
  }

  // ── Stage 2: LLM inference ─────────────────────────────────────────────────
  const { result: inferred, durationMs: inferMs, costMicros: inferCost } = await inferProfile(crawlResult.text, input.sourceUrl);

  const businessName = str(inferred.businessName, new URL(input.sourceUrl).hostname.replace(/^www\./, ''));
  const promoting = str(inferred.promoting);
  const businessModel = (['b2c', 'b2b', 'd2c'].includes(str(inferred.businessModel)) ? str(inferred.businessModel) : 'b2c') as 'b2c' | 'b2b' | 'd2c';
  const inferredVertical = KNOWN_VERTICALS.includes(str(inferred.vertical, 'generic')) ? str(inferred.vertical, 'generic') : 'generic';
  const vertical =
    input.verticalHint ??
    (await classifyVertical({ businessName, promoting, description: str(inferred.description), businessModel })) ??
    inferredVertical;
  const inferStage: StageMetrics = { durationMs: inferMs, costUsdMicros: inferCost + VERTICAL_COST_MICROS };
  const geography = str(inferred.geography);

  // ── Stage 3: competitor discovery (Exa search, validated — not LLM memory) ──
  const { competitors, durationMs: competitorMs, costUsdMicros: competitorCost } = await findCompetitors({
    businessName,
    promoting,
    geography,
    sourceUrl: input.sourceUrl,
  });
  const competitorStage: StageMetrics = { durationMs: competitorMs, costUsdMicros: competitorCost };

  // Target customer industries: kept only when a verbatim quote from the crawl backs them up.
  // Also drop vertical-enum slugs the model sometimes echoes ("automotive" instead of "auto mechanics").
  const grounded = groundIndustries(inferred.targetCustomerIndustries, crawlResult.text);
  const keep = grounded.industries.map((n) => !KNOWN_VERTICALS.includes(n.toLowerCase()) && n.toLowerCase() !== 'generic');
  const targetCustomerIndustries = grounded.industries.filter((_, i) => keep[i]);
  const industryEvidence = grounded.evidence.filter((_, i) => keep[i]);
  console.log(`[studio/profile] targetCustomerIndustries raw=${JSON.stringify(inferred.targetCustomerIndustries ?? [])} grounded=${JSON.stringify(targetCustomerIndustries)}`);

  // ── Stage 4: keyword discovery — seeded from IDC niches, relevance-verified ─
  // Same derivation as keywordInputFromProfile() so the research step sees a matching signature.
  const keywordInput = {
    businessName,
    vertical,
    audienceType: businessModel === 'b2b' ? 'b2b' : 'b2c',
    promoting,
    targetCustomerIndustries,
  };
  const { keywords, durationMs: keywordMs, verified: keywordsVerified } = await discoverKeywords(keywordInput);
  const keywordStage: StageMetrics = { durationMs: keywordMs, costUsdMicros: 0 };

  const totalDurationMs = crawlResult.durationMs + inferMs + competitorMs + keywordMs;
  const totalCostUsdMicros = crawlResult.costUsdMicros + inferStage.costUsdMicros + competitorCost;

  // ── Assemble profile ───────────────────────────────────────────────────────
  const rawHooks = Array.isArray(inferred.suggestedHooks)
    ? inferred.suggestedHooks.filter((h): h is string => typeof h === 'string')
    : [];

  const confidence = crawlResult.text.length > 500 ? 0.8 : 0.5;

  const data: StudioProfileData = {
    classification: {
      vertical: envelope(vertical, 'inferred', confidence),
      subVertical: envelope(str(inferred.subVertical), 'inferred', confidence),
      businessModel: envelope(businessModel, 'inferred', confidence),
    },
    identity: {
      businessName: envelope(businessName, 'crawl', 0.9),
      tagline: envelope(str(inferred.tagline), 'crawl', confidence),
      description: envelope(str(inferred.description), 'inferred', confidence),
      logoUrl: envelope<string | null>(null, 'inferred', 0),
      primaryColor: envelope<string | null>(null, 'inferred', 0),
    },
    positioning: {
      promoting: envelope(promoting, 'inferred', confidence),
      offer: envelope(str(inferred.offer), 'inferred', confidence),
      positioning: envelope(str(inferred.positioning), 'inferred', confidence),
      geography: envelope(geography, 'inferred', confidence),
    },
    market: {
      audienceDescription: envelope(str(inferred.audienceDescription), 'inferred', confidence),
      targetCustomerIndustries: {
        ...envelope(targetCustomerIndustries, 'inferred', targetCustomerIndustries.length > 0 ? confidence : 0),
        evidence: industryEvidence,
      },
      competitors: envelope(competitors, 'inferred', competitors.length > 0 ? 0.8 : 0),
      keywords: {
        ...envelope(keywords, 'inferred', keywordsVerified ? 0.8 : 0.4),
        derivedFrom: keywordInputSignature(keywordInput),
      },
    },
    tone: {
      tone: envelope(str(inferred.tone, 'casual_professional'), 'inferred', confidence),
      hooks: envelope(rawHooks, 'inferred', confidence),
    },
  };

  console.log(`[studio/profile] extractProfile DONE url=${input.sourceUrl} durationMs=${totalDurationMs} costMicros=${totalCostUsdMicros} idc=${JSON.stringify(targetCustomerIndustries)} keywords=${JSON.stringify(keywords)}`);
  return {
    data,
    telemetry: {
      stages: { crawl: crawlStage, infer: inferStage, competitors: competitorStage, keywords: keywordStage },
      totalDurationMs,
      totalCostUsdMicros,
    },
  };
}

// ─── Placeholder (crawl failed) ────────────────────────────────────────────────

function emptyEnvelope(value: string): FieldEnvelope {
  return { value, source: 'inferred', confidence: 0, locked: false };
}

function buildPlaceholder(hostname: string): StudioProfileData {
  return {
    classification: {
      vertical: emptyEnvelope('generic'),
      subVertical: emptyEnvelope(''),
      businessModel: emptyEnvelope('b2c'),
    },
    identity: {
      businessName: emptyEnvelope(hostname),
      tagline: emptyEnvelope(''),
      description: emptyEnvelope(''),
      logoUrl: { value: null, source: 'inferred', confidence: 0, locked: false },
      primaryColor: { value: null, source: 'inferred', confidence: 0, locked: false },
    },
    positioning: {
      promoting: emptyEnvelope(''),
      offer: emptyEnvelope(''),
      positioning: emptyEnvelope(''),
      geography: emptyEnvelope(''),
    },
    market: {
      audienceDescription: emptyEnvelope(''),
      targetCustomerIndustries: { value: [], source: 'inferred', confidence: 0, locked: false },
      competitors: { value: [], source: 'inferred', confidence: 0, locked: false },
      keywords: { value: [], source: 'inferred', confidence: 0, locked: false },
    },
    tone: {
      tone: emptyEnvelope('casual_professional'),
      hooks: { value: [], source: 'inferred', confidence: 0, locked: false },
    },
  };
}
