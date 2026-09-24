/**
 * Campaign Studio v1 — Generation stage.
 * M1: stub that returns an empty list.
 * M4: replace with real LLM slide text + background image generation.
 */
// server-only
import type { GuardrailWarning, SlideshowPayload, StageMetrics } from './types';

export type GenerateInput = {
  runId: string;
  profileVersion: number;
};

export type CandidateDraft = {
  templateId?: string;
  angle?: string;
  payload: SlideshowPayload;
  guardrailWarnings: GuardrailWarning[];
  costUsdMicros: number;
  generateDurationMs: number;
};

export type GenerateResult = {
  candidates: CandidateDraft[];
  telemetry: {
    slideText: StageMetrics;
    imageGen: StageMetrics;
    totalDurationMs: number;
    totalCostUsdMicros: number;
  };
};

/** M1 stub. */
export async function runGeneration(_input: GenerateInput): Promise<GenerateResult> {
  // TODO (M4): generate slide text, generate background images, run guardrail pass.
  return {
    candidates: [],
    telemetry: {
      slideText: { durationMs: 0, costUsdMicros: 0 },
      imageGen: { durationMs: 0, costUsdMicros: 0 },
      totalDurationMs: 0,
      totalCostUsdMicros: 0,
    },
  };
}
