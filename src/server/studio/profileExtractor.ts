/**
 * Campaign Studio v1 — Profile extraction.
 * M1: stub that returns a placeholder profile so the UI can be wired up.
 * M2: replace the placeholder with real Exa + LLM extraction.
 *
 * This is a pure function: no DB writes. The caller (route handler) is responsible
 * for persisting the result via waitUntil().
 */
// server-only
import type { ExtractTelemetry, StudioProfileData } from './types';

export type ExtractProfileInput = {
  sourceUrl: string;
  /** Admin can pass a hint to override the classification. */
  verticalHint?: string;
};

export type ExtractProfileResult = {
  data: StudioProfileData;
  telemetry: ExtractTelemetry;
};

function emptyEnvelope(value: string) {
  return { value, source: 'inferred' as const, confidence: 0.5, locked: false };
}

/** M1 stub: returns placeholder data without making any API calls. */
export async function extractProfile(input: ExtractProfileInput): Promise<ExtractProfileResult> {
  const startedAt = Date.now();
  const hostname = (() => {
    try {
      return new URL(input.sourceUrl).hostname;
    } catch {
      return input.sourceUrl;
    }
  })();

  // TODO (M2): crawl homepage, infer profile with LLM, validate competitors with Exa.
  const data: StudioProfileData = {
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

  const durationMs = Date.now() - startedAt;
  const zeroStage = { durationMs: 0, costUsdMicros: 0 };
  const telemetry: ExtractTelemetry = {
    stages: { crawl: zeroStage, infer: zeroStage, competitors: zeroStage, keywords: zeroStage },
    totalDurationMs: durationMs,
    totalCostUsdMicros: 0,
  };

  return { data, telemetry };
}
