/**
 * Campaign Studio v1 — Research stage.
 * M1: stub that returns an empty list.
 * M3: replace with real TikHub search + Exa competitor discovery + transcript fetch.
 */
// server-only
import type { StageMetrics } from './types';

export type ResearchInput = {
  runId: string;
  keywords: string[];
  vertical: string;
};

export type ResearchResult = {
  /** Number of items stored. */
  count: number;
  telemetry: {
    search: StageMetrics;
    transcripts: StageMetrics;
    totalDurationMs: number;
    totalCostUsdMicros: number;
  };
};

/** M1 stub. */
export async function runResearch(_input: ResearchInput): Promise<ResearchResult> {
  // TODO (M3): call TikHub + Exa, fetch transcripts, match templates, store items.
  return {
    count: 0,
    telemetry: {
      search: { durationMs: 0, costUsdMicros: 0 },
      transcripts: { durationMs: 0, costUsdMicros: 0 },
      totalDurationMs: 0,
      totalCostUsdMicros: 0,
    },
  };
}
