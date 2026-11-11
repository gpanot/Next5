// server-only — never import from a 'use client' file.
// A Prospect Pack's cost, line by line, for the admin's cost popup: the owner's paid calls grouped by part of the pack
// (from the route that started them) and model. Packs made before that billing show their brand run's step items
// instead, the same source their total uses (store.ts costsOf).

import { prisma } from '../../lib/db';
import type { StepCost } from '../../types/admin/metaAds';
import type { ProspectCostLine, ProspectCostsDto } from '../../types/admin/prospects';
import { loadPack, runCostsOf } from './store';

/** The part of the pack a call was for, from the route that started it (costs/ledger.ts featureOf). */
const partOf = (feature: string | null): string => {
  if (!feature) return 'Background';
  if (feature === 'POST /api/admin/prospects') return 'Site + faces';
  if (feature.endsWith('/approve') || feature.endsWith('/continue')) return 'Brand Cast';
  if (feature.endsWith('/ideas')) return 'Blitz ideas';
  if (feature.endsWith('/advance')) return 'Videos + Hooks Volume';
  if (feature.includes('/claim') || feature.includes('/unlock')) return 'After claim';
  return feature;
};

const byCostDesc = (a: ProspectCostLine, b: ProspectCostLine) => b.usd - a.usd;

const ledgerLines = async (ownerUserId: string): Promise<ProspectCostLine[]> => {
  const rows = await prisma.apiCostEvent.groupBy({
    by: ['feature', 'provider', 'model'],
    where: { userId: ownerUserId },
    _sum: { costUsdMicros: true },
    _count: { _all: true },
  });
  const lines = new Map<string, ProspectCostLine>();
  for (const row of rows) {
    const part = partOf(row.feature);
    const key = `${part}|${row.provider}|${row.model}`;
    const line = lines.get(key) ?? { part, provider: row.provider, model: row.model, calls: 0, usd: 0 };
    line.calls += row._count._all;
    line.usd += (row._sum.costUsdMicros ?? 0) / 1e6;
    lines.set(key, line);
  }
  return [...lines.values()].sort(byCostDesc);
};

/** The brand run's step items (and its Blitz Script Bank), for packs made before the ledger. */
const runLines = async (runId: string): Promise<ProspectCostLine[]> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { stepCosts: true, brandProfileId: true } });
  const steps = Object.entries((run?.stepCosts ?? {}) as Record<string, StepCost>);
  const lines = steps.flatMap(([step, cost]) => (cost?.items ?? []).map((item) => ({ part: `Step ${step}`, provider: '', model: item.label, calls: 1, usd: item.usdMicros / 1e6 })));
  const bank = run?.brandProfileId ? await prisma.blitzScriptBank.findFirst({ where: { brandProfileId: run.brandProfileId }, select: { costMicros: true } }) : null;
  if (bank?.costMicros) lines.push({ part: 'Blitz Script Bank', provider: '', model: 'scripts', calls: 1, usd: bank.costMicros / 1e6 });
  return lines.sort(byCostDesc);
};

export const packCosts = async (id: string): Promise<ProspectCostsDto> => {
  const pack = await loadPack(id);
  const [ledger, runs] = await Promise.all([ledgerLines(pack.ownerUserId), runCostsOf([pack])]);
  const ledgerUsd = ledger.reduce((sum, l) => sum + l.usd, 0);
  const runUsd = (pack.brandRunId ? runs.get(pack.brandRunId) ?? 0 : 0) / 1e6;
  if (ledgerUsd >= runUsd || !pack.brandRunId) return { totalUsd: ledgerUsd, source: 'ledger', lines: ledger };
  return { totalUsd: runUsd, source: 'run', lines: await runLines(pack.brandRunId) };
};
