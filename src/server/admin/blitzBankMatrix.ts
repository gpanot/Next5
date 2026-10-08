// server-only — never import from a 'use client' file.
// The admin workspace page's Blitz Matrix tab: every Blitz Script Bank the workspace's site profiles have, with each
// story's lines and hooks and how many idea cards the workspace got from it.

import { prisma } from '../../lib/db';
import type { BlitzBankDto, BlitzBankMatrixDto } from '../../types/admin/workspaceDetail';
import { storyUsage, type BlitzBankContent } from '../labs/blitzBank';

const LINE_LABELS: Array<[keyof BlitzBankContent['audiences'][number]['stories'][number]['story'], string]> = [
  ['pain', 'Pain'],
  ['oldWay', 'Old way'],
  ['mechanism', 'Mechanism'],
  ['proof', 'Proof'],
  ['inaction', 'Cost of waiting'],
  ['cta', 'Call to action'],
];

export const blitzBankMatrix = async (workspaceId: string): Promise<BlitzBankMatrixDto> => {
  const runs = await prisma.studioRun.findMany({ where: { workspaceId }, distinct: ['brandProfileId'], select: { brandProfileId: true } });
  const profileIds = runs.map((r) => r.brandProfileId);
  const [banks, profiles, usage] = await Promise.all([
    prisma.blitzScriptBank.findMany({ where: { brandProfileId: { in: profileIds } }, orderBy: { updatedAt: 'desc' } }),
    prisma.studioBrandProfile.findMany({ where: { id: { in: profileIds } }, select: { id: true, sourceUrl: true } }),
    storyUsage(workspaceId),
  ]);
  const urlOf = new Map(profiles.map((p) => [p.id, p.sourceUrl]));
  return {
    banks: banks.map((b): BlitzBankDto => {
      const content = b.content as unknown as BlitzBankContent | null;
      return {
        id: b.id,
        sourceUrl: urlOf.get(b.brandProfileId) ?? '',
        status: b.status,
        error: b.error,
        costMicros: b.costMicros,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        audiences: (content?.audiences ?? []).map((a) => ({
          idc: a.idc,
          categories: a.categories,
          tone: a.tone,
          proofNote: a.proofNote,
          stories: a.stories.map((s) => ({
            id: s.id,
            lines: LINE_LABELS.map(([key, label]) => ({ label, text: s.story[key] })),
            hooks: s.hooks,
            used: usage.get(s.id) ?? 0,
          })),
        })),
      };
    }),
  };
};
