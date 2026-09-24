/**
 * Campaign Studio v1 — Profile extraction.
 * Crawls the client's website, infers brand identity and market position with an LLM,
 * validates competitors with Exa findSimilar, and returns a fully-populated StudioProfileData.
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

interface ExaSimilarResponse {
  results: Array<{ url?: string; title?: string; text?: string }>;
}

interface ExaSearchResponse {
  results: Array<{ url?: string; title?: string }>;
}

async function exaFetch<T>(endpoint: string, body: object): Promise<T | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.exa.ai${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
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

/** Discover competitor domains via Exa findSimilar. Returns up to 5 base domain URLs. */
async function findCompetitors(url: string): Promise<{ competitors: string[]; durationMs: number }> {
  const t0 = Date.now();
  const data = await exaFetch<ExaSimilarResponse>('/findSimilar', {
    url,
    numResults: 8,
    excludeSourceDomain: true,
    type: 'company',
  });
  const competitors = (data?.results ?? [])
    .map((r) => {
      try { return new URL(r.url ?? '').hostname.replace(/^www\./, ''); } catch { return null; }
    })
    .filter((h): h is string => Boolean(h))
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 5);
  return { competitors, durationMs: Date.now() - t0 };
}

/** Search for industry keywords using Exa. Returns up to 5 relevant query terms. */
async function discoverKeywords(businessName: string, vertical: string): Promise<{ keywords: string[]; durationMs: number }> {
  const t0 = Date.now();
  const query = `${businessName} ${vertical} tips advice content`;
  const data = await exaFetch<ExaSearchResponse>('/search', {
    query,
    numResults: 10,
    type: 'keyword',
    category: 'tweet',
  });
  // Extract meaningful keywords from titles
  const raw = (data?.results ?? []).flatMap((r) => {
    const title = r.title ?? '';
    // Split titles on common separators, take 2-4 word phrases
    return title.split(/[|·—\-–,]/g).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 4 && s.length < 50);
  });
  const unique = [...new Set(raw)].slice(0, 6);
  return { keywords: unique.length > 0 ? unique : [`${vertical} tips`, `${businessName.toLowerCase()} advice`], durationMs: Date.now() - t0 };
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
- promoting: max 15 words. What the business is.
- offer: max 15 words. The core value proposition.
- positioning: max 20 words. Key differentiator.
- geography: city/region/country served, or "global". Max 10 words. "" if unclear.
- tagline: the actual tagline from the homepage, or "".
- audienceDescription: who the typical customer is, max 20 words.
- tone: one of [casual, casual_professional, professional, witty, authoritative, friendly].
- suggestedHooks: 2–3 hook patterns for TikTok, each 5–10 words.

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
  "tone": "...",
  "suggestedHooks": ["...", "..."]
}`;

/** Token cost in micros for gpt-4o-mini (approximate). */
function inferCostMicros(inputTokens: number, outputTokens: number): number {
  // gpt-4o-mini: $0.15/1M input, $0.60/1M output
  return Math.round((inputTokens * 0.15 + outputTokens * 0.60) / 1_000);
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
  tone?: string;
  suggestedHooks?: unknown[];
};

async function inferProfile(text: string, url: string): Promise<{ result: InferResult; durationMs: number; costMicros: number }> {
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

  return {
    result: result ?? {},
    durationMs: Date.now() - t0,
    costMicros: inferCostMicros(inputTokens, outputTokens),
  };
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

  // ── Stage 3: competitor discovery ──────────────────────────────────────────
  const { competitors, durationMs: competitorMs } = await findCompetitors(input.sourceUrl);
  const competitorStage: StageMetrics = { durationMs: competitorMs, costUsdMicros: 0 };

  // ── Stage 4: keyword discovery ─────────────────────────────────────────────
  const { keywords, durationMs: keywordMs } = await discoverKeywords(businessName, vertical);
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
      competitors: envelope(competitors, 'inferred', competitorMs > 0 ? 0.8 : 0),
      keywords: envelope(keywords, 'inferred', keywordMs > 0 ? 0.7 : 0.3),
    },
    tone: {
      tone: envelope(str(inferred.tone, 'casual_professional'), 'inferred', confidence),
      hooks: envelope(rawHooks, 'inferred', confidence),
    },
  };

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
      competitors: { value: [], source: 'inferred', confidence: 0, locked: false },
      keywords: { value: [], source: 'inferred', confidence: 0, locked: false },
    },
    tone: {
      tone: emptyEnvelope('casual_professional'),
      hooks: { value: [], source: 'inferred', confidence: 0, locked: false },
    },
  };
}
