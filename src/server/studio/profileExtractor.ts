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
import { crawlPage } from './exa';
import { findCompetitors } from './competitors';
import { discoverKeywords } from './keywordDiscovery';

// ─── LLM profile inference ────────────────────────────────────────────────────

const KNOWN_VERTICALS_LIST = KNOWN_VERTICALS.join(', ');

const INFER_SYSTEM_PROMPT = `You read a business homepage and extract a structured brand profile for a social-media content tool. This must work correctly for ANY small business — a local auto repair shop, a chiropractor, a day spa, a B2B SaaS vendor, a restaurant, an ecommerce brand — not just the examples given.

Rules:
- Invent NOTHING. If you cannot determine a field, use "" or null.
- audienceType: "b2c" (sells to consumers), "b2b" (sells to businesses), or "both".
- vertical: one of [${KNOWN_VERTICALS_LIST}] or "generic". Pick the closest real match — e.g. an auto repair shop or mechanic is "automotive", a chiropractor/dentist/physical therapist is "health_wellness", a day spa/salon/massage studio is "beauty_spa". Only use "generic" when nothing plausibly fits.
- subVertical: a short label (e.g. "luxury residential", "SaaS HR tools", "auto body & collision"). Max 3 words.
- businessModel: "b2c", "b2b", or "d2c".
- promoting: max 15 words. What the business is, including WHO it serves (e.g. "Booking software for electricians and mechanics").
- offer: max 15 words. The core value proposition.
- positioning: max 20 words. Key differentiator.
- geography: city/region/country served, or "global". Max 10 words. "" if unclear.
- tagline: the actual tagline from the homepage, or "".
- audienceDescription: who the typical customer is, max 20 words.
- targetCustomerIndustries: CRITICAL for B2B — list the specific industry niches this business explicitly sells TO (e.g. ["auto mechanics", "electricians", "plumbers"]). These are the END CUSTOMER industries, not the vendor's own.
  Write plain-English industry names as a real person would say them. NEVER reuse a value from the "vertical" list above (that field describes the vendor itself, one single category) — targetCustomerIndustries describes the vendor's different customers, in ordinary words, not category slugs.
  IMPORTANT SOURCE: testimonials, case studies, client logos, and "trusted by" sections are the most reliable signal — a quote attributed to "Owner at [Company Name]" or a client name like "Nash Street Mechanical" reveals the real customer industry even when the page never states it directly. Always check these before giving up.
  Empty array [] only if truly B2C, or if B2B with genuinely no signal anywhere in the text (do not guess). Max 5 items, each max 3 words, plain industry names only (e.g. "auto mechanics", never "automotive").
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
  "targetCustomerIndustries": ["...", "..."],
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
      { role: 'user', content: text.slice(0, 3500) },
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
  const crawlResult = await crawlPage(input.sourceUrl);
  const crawlStage: StageMetrics = { durationMs: crawlResult.durationMs, costUsdMicros: 0 };

  if (!crawlResult.text) {
    // Fallback: return placeholder profile — admin will fill manually
    const hostname = (() => { try { return new URL(input.sourceUrl).hostname.replace(/^www\./, ''); } catch { return input.sourceUrl; } })();
    return {
      data: buildPlaceholder(hostname),
      telemetry: { stages: { crawl: crawlStage, infer: zeroStage, competitors: zeroStage, keywords: zeroStage }, totalDurationMs: crawlResult.durationMs, totalCostUsdMicros: 0 },
    };
  }

  // ── Stage 2: LLM inference ─────────────────────────────────────────────────
  const { result: inferred, durationMs: inferMs, costMicros: inferCost } = await inferProfile(crawlResult.text, input.sourceUrl);
  const inferStage: StageMetrics = { durationMs: inferMs, costUsdMicros: inferCost };

  const vertical = input.verticalHint ?? (KNOWN_VERTICALS.includes(str(inferred.vertical, 'generic')) ? str(inferred.vertical, 'generic') : 'generic');
  const businessName = str(inferred.businessName, new URL(input.sourceUrl).hostname.replace(/^www\./, ''));
  const promoting = str(inferred.promoting);
  const geography = str(inferred.geography);

  // ── Stage 3: competitor discovery (Exa search, validated — not LLM memory) ──
  const { competitors, durationMs: competitorMs, costUsdMicros: competitorCost } = await findCompetitors({
    businessName,
    promoting,
    geography,
    sourceUrl: input.sourceUrl,
  });
  const competitorStage: StageMetrics = { durationMs: competitorMs, costUsdMicros: competitorCost };

  // Extract IDC niches from LLM output (target customer industries for B2B vendors).
  // Defensive filter: the model occasionally echoes a `vertical` enum slug here instead of a
  // plain-English industry name (e.g. "automotive" instead of "auto mechanics") — drop those,
  // since a vertical-pack slug is not a real TikTok search topic and would defeat the whole
  // point of this field (it exists to escape the vendor's own vertical, not restate it).
  const targetCustomerIndustries = Array.isArray(inferred.targetCustomerIndustries)
    ? inferred.targetCustomerIndustries
        .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        .filter((n) => !KNOWN_VERTICALS.includes(n.trim().toLowerCase()) && n.trim().toLowerCase() !== 'generic')
        .slice(0, 5)
    : [];

  const audienceType = (['b2c', 'b2b', 'both'].includes(str(inferred.audienceType)) ? str(inferred.audienceType) : 'b2c') as 'b2c' | 'b2b' | 'both';

  // ── Stage 4: keyword discovery — seeded from IDC niches, relevance-verified ─
  const { keywords, durationMs: keywordMs, verified: keywordsVerified } = await discoverKeywords({
    businessName,
    vertical,
    audienceType,
    promoting,
    targetCustomerIndustries,
  });
  const keywordStage: StageMetrics = { durationMs: keywordMs, costUsdMicros: 0 };

  const totalDurationMs = crawlResult.durationMs + inferMs + competitorMs + keywordMs;
  const totalCostUsdMicros = inferCost + competitorCost;

  // ── Assemble profile ───────────────────────────────────────────────────────
  const rawHooks = Array.isArray(inferred.suggestedHooks)
    ? inferred.suggestedHooks.filter((h): h is string => typeof h === 'string')
    : [];

  const businessModel = (['b2c', 'b2b', 'd2c'].includes(str(inferred.businessModel)) ? str(inferred.businessModel) : 'b2c') as 'b2c' | 'b2b' | 'd2c';

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
      targetCustomerIndustries: envelope(targetCustomerIndustries, 'inferred', targetCustomerIndustries.length > 0 ? confidence : 0),
      competitors: envelope(competitors, 'inferred', competitors.length > 0 ? 0.8 : 0),
      keywords: envelope(keywords, 'inferred', keywordsVerified ? 0.8 : 0.4),
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
