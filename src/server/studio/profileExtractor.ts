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

// ─── Exa helpers ──────────────────────────────────────────────────────────────

interface ExaContentsResponse {
  results: Array<{ text?: string; title?: string; url?: string }>;
}

interface ExaSearchResponse {
  results: Array<{ url?: string; title?: string }>;
}

async function exaFetch<T>(endpoint: string, body: object): Promise<T | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    console.warn(`[studio/profile] EXA_API_KEY not set — skipping Exa ${endpoint}`);
    return null;
  }
  const t0 = Date.now();
  console.log(`[studio/profile] Exa ${endpoint} →`, JSON.stringify(body).slice(0, 120));
  try {
    const res = await fetch(`https://api.exa.ai${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[studio/profile] Exa ${endpoint} HTTP ${res.status} in ${Date.now() - t0}ms`);
      return null;
    }
    const data = (await res.json()) as T;
    console.log(`[studio/profile] Exa ${endpoint} OK in ${Date.now() - t0}ms`);
    return data;
  } catch (err) {
    console.error(`[studio/profile] Exa ${endpoint} FAILED in ${Date.now() - t0}ms:`, err);
    return null;
  }
}

/** Crawl a URL and return up to 3500 chars of cleaned text. */
async function crawlPage(url: string): Promise<{ text: string | null; durationMs: number }> {
  const t0 = Date.now();
  const data = await exaFetch<ExaContentsResponse>('/contents', {
    urls: [url],
    text: { maxCharacters: 3_500 },
    livecrawlTimeout: 15_000,
  });
  return { text: data?.results?.[0]?.text ?? null, durationMs: Date.now() - t0 };
}

/** Infer the top 3 real-world competitors from crawled page text using GPT-4o-mini.
 * Does NOT require competitors to be named on the page — uses world knowledge
 * about the business category to return the most likely direct rivals.
 */
async function findCompetitors(pageText: string, businessName: string): Promise<{ competitors: string[]; durationMs: number }> {
  const t0 = Date.now();
  console.log(`[studio/profile] LLM competitor inference for "${businessName}"`);

  const result = await chatJson<{ competitors?: unknown[] }>(
    [
      {
        role: 'system',
        content: `You read a business homepage and return its top 3 direct competitors.
Rules:
- Use the homepage content AND your world knowledge about this business category.
- Prefer well-known direct alternatives (same product category, same target customer).
- Return brand names only (e.g. "Calendly", "Acuity Scheduling") — no descriptions.
- If a competitor is explicitly named on the page, prioritise it.
- Always return exactly 3, even if you must use general knowledge. Never return the business itself.
Return JSON only: { "competitors": ["Brand A", "Brand B", "Brand C"] }`,
      },
      { role: 'user', content: `Business: ${businessName}\n\nHomepage:\n${pageText.slice(0, 3_000)}` },
    ],
    { maxTokens: 80, temperature: 0.1, model: 'gpt-4o-mini' },
  );

  const raw = Array.isArray(result?.competitors) ? result.competitors : [];
  const competitors = raw
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim())
    .slice(0, 3);

  console.log(`[studio/profile] competitors: ${JSON.stringify(competitors)} in ${Date.now() - t0}ms`);
  return { competitors, durationMs: Date.now() - t0 };
}

/** Search for industry keywords using Exa.
 * For B2B vendors, seeds from the IDC (target customer) industries rather than the vendor's own vertical,
 * so TikTok research finds content relevant to the END CUSTOMER, not generic SaaS/software content.
 */
async function discoverKeywords(
  businessName: string,
  vertical: string,
  targetCustomerIndustries: string[],
): Promise<{ keywords: string[]; durationMs: number }> {
  const t0 = Date.now();

  // Prefer IDC niches for B2B vendors — they generate content FOR their customers, not about themselves
  const seedNiches = targetCustomerIndustries.length > 0 ? targetCustomerIndustries : [vertical];
  const seedQuery = seedNiches.slice(0, 2).join(' ');
  const query = `${seedQuery} tips bookings small business advice`;

  const data = await exaFetch<ExaSearchResponse>('/search', {
    query,
    numResults: 10,
    type: 'keyword',
    category: 'tweet',
  });
  // Extract meaningful keywords from titles
  const raw = (data?.results ?? []).flatMap((r) => {
    const title = r.title ?? '';
    return title.split(/[|·—\-–,]/g).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 4 && s.length < 50);
  });
  const unique = [...new Set(raw)].slice(0, 6);

  // Fallback: use IDC niche names directly as keywords
  const fallback = targetCustomerIndustries.length > 0
    ? targetCustomerIndustries.map((n) => `${n} tips`)
    : [`${vertical} tips`, `${businessName.toLowerCase()} advice`];

  return { keywords: unique.length > 0 ? unique : fallback, durationMs: Date.now() - t0 };
}

// ─── LLM profile inference ────────────────────────────────────────────────────

const KNOWN_VERTICALS_LIST = KNOWN_VERTICALS.join(', ');

const INFER_SYSTEM_PROMPT = `You read a business homepage and extract a structured brand profile for a social-media content tool.

Rules:
- Invent NOTHING. If you cannot determine a field, use "" or null.
- audienceType: "b2c" (sells to consumers), "b2b" (sells to businesses), or "both".
- vertical: one of [${KNOWN_VERTICALS_LIST}] or "generic".
- subVertical: a short label (e.g. "luxury residential", "SaaS HR tools"). Max 3 words.
- businessModel: "b2c", "b2b", or "d2c".
- promoting: max 15 words. What the business is, including WHO it serves (e.g. "Booking software for electricians and mechanics").
- offer: max 15 words. The core value proposition.
- positioning: max 20 words. Key differentiator.
- geography: city/region/country served, or "global". Max 10 words. "" if unclear.
- tagline: the actual tagline from the homepage, or "".
- audienceDescription: who the typical customer is, max 20 words.
- targetCustomerIndustries: CRITICAL for B2B — list the specific industry niches this business explicitly sells TO (e.g. ["auto mechanics", "electricians", "plumbers"]). These are the END CUSTOMER industries, not the vendor's own. Empty array [] if B2C or not specified. Max 5 items, each max 3 words.
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
 * Cost: ~$0.001–$0.003 per run (Exa crawl + LLM inference).
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

  // ── Stage 3: competitor discovery (LLM from crawled text — no extra API call) ──
  const { competitors, durationMs: competitorMs } = await findCompetitors(crawlResult.text, businessName);
  const competitorStage: StageMetrics = { durationMs: competitorMs, costUsdMicros: 0 };

  // Extract IDC niches from LLM output (target customer industries for B2B vendors)
  const targetCustomerIndustries = Array.isArray(inferred.targetCustomerIndustries)
    ? inferred.targetCustomerIndustries.filter((n): n is string => typeof n === 'string' && n.trim().length > 0).slice(0, 5)
    : [];

  // ── Stage 4: keyword discovery — seeded from IDC niches when available ─────
  const { keywords, durationMs: keywordMs } = await discoverKeywords(businessName, vertical, targetCustomerIndustries);
  const keywordStage: StageMetrics = { durationMs: keywordMs, costUsdMicros: 0 };

  const totalDurationMs = crawlResult.durationMs + inferMs + competitorMs + keywordMs;
  const totalCostUsdMicros = inferCost;

  // ── Assemble profile ───────────────────────────────────────────────────────
  const rawHooks = Array.isArray(inferred.suggestedHooks)
    ? inferred.suggestedHooks.filter((h): h is string => typeof h === 'string')
    : [];

  const businessModel = (['b2c', 'b2b', 'd2c'].includes(str(inferred.businessModel)) ? str(inferred.businessModel) : 'b2c') as 'b2c' | 'b2b' | 'd2c';
  const audienceType = (['b2c', 'b2b', 'both'].includes(str(inferred.audienceType)) ? str(inferred.audienceType) : 'b2c') as 'b2c' | 'b2b' | 'both';

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
      promoting: envelope(str(inferred.promoting), 'inferred', confidence),
      offer: envelope(str(inferred.offer), 'inferred', confidence),
      positioning: envelope(str(inferred.positioning), 'inferred', confidence),
      geography: envelope(str(inferred.geography), 'inferred', confidence),
    },
    market: {
      audienceDescription: envelope(str(inferred.audienceDescription), 'inferred', confidence),
      targetCustomerIndustries: envelope(targetCustomerIndustries, 'inferred', targetCustomerIndustries.length > 0 ? confidence : 0),
      competitors: envelope(competitors, 'inferred', competitorMs > 0 ? 0.8 : 0),
      keywords: envelope(keywords, 'inferred', keywordMs > 0 ? 0.7 : 0.3),
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
