// server-only — never import from a 'use client' file.
// UGC Lab wait estimates from real Seedance timings.

import { UGC_DURATIONS, UGC_RESOLUTION, UGC_VIDEO_TIMEOUT_SEC } from '../../config/ugcLab';
import type { UgcEta } from '../../types/admin/ugc';
import { prisma } from '../../lib/db';

/** Most recent videos per estimate: recent speed matters more than old speed. */
const SAMPLE_SIZE = 15;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

type Timing = { durationSec: number; generationSeconds: number; timingPrecise: boolean };

/** Precise timings when there are any, else rough ones. */
const pick = (rows: Timing[]): Timing[] => {
  const precise = rows.filter((r) => r.timingPrecise);
  return (precise.length > 0 ? precise : rows).slice(0, SAMPLE_SIZE);
};

const estimate = (rows: Timing[], basis: UgcEta['basis']): UgcEta => {
  const used = pick(rows);
  return {
    seconds: median(used.map((r) => r.generationSeconds)),
    samples: used.length,
    precise: used.every((r) => r.timingPrecise),
    basis,
  };
};

/**
 * Median generation time per video length at the testing resolution.
 * A length with no videos yet borrows the median of all lengths, marked as such.
 */
export const generationEtas = async (): Promise<Partial<Record<number, UgcEta>>> => {
  const rows = (await prisma.ugcVideo.findMany({
    where: {
      status: 'ready', resolution: UGC_RESOLUTION, mode: { not: 'imported' },
      // A timing past the give-up point means the video sat unchecked, not that it took that long.
      generationSeconds: { not: null, lte: UGC_VIDEO_TIMEOUT_SEC },
    },
    orderBy: { completedAt: 'desc' },
    take: 200,
    select: { durationSec: true, generationSeconds: true, timingPrecise: true },
  })) as Timing[];
  if (rows.length === 0) return {};

  const etas: Partial<Record<number, UgcEta>> = {};
  for (const duration of UGC_DURATIONS) {
    const same = rows.filter((r) => r.durationSec === duration);
    etas[duration] = same.length > 0 ? estimate(same, 'same_length') : estimate(rows, 'all_lengths');
  }
  return etas;
};
