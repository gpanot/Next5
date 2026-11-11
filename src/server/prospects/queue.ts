// server-only — never import from a 'use client' file.
// At most PROSPECT_MAX_ACTIVE packs are made at once (reading the site, or making posts; a pack waiting for the face
// check does not count). A new pack past that, or behind packs already waiting, is 'queued': its run is created but
// not started. Each advance call of a queued pack (the admin tab polls them too) starts it once a slot is free and it
// is among the oldest waiting. Two calls at the same moment can start one pack too many; the next ones wait again.

import type { ProspectPack } from '@prisma/client';
import { prisma } from '../../lib/db';
import { PROSPECT_MAX_ACTIVE } from '../../types/admin/prospects';
import { runAutoPipeline } from '../autoSlideshow/pipeline';
import { withUserCostContext } from '../costs/ledger';

const freeSlots = async (): Promise<number> => PROSPECT_MAX_ACTIVE - (await prisma.prospectPack.count({ where: { status: { in: ['building', 'making'] } } }));

/** The run's steps 1-3 (held after step 3 for the face check), billed to the pack's placeholder owner. */
export const startJob = (pack: Pick<ProspectPack, 'ownerUserId' | 'brandRunId'>) => (): Promise<void> =>
  withUserCostContext(pack.ownerUserId, () => runAutoPipeline(pack.brandRunId!, 1));

/** For a new pack: start now only when a slot is free and nobody is waiting. */
export const canStartNow = async (): Promise<boolean> => {
  const [free, waiting] = await Promise.all([freeSlots(), prisma.prospectPack.count({ where: { status: 'queued' } })]);
  return free > 0 && waiting === 0;
};

/** Starts a queued pack when its turn has come; returns the job to run, or null while it waits. */
export const startIfTurn = async (pack: ProspectPack): Promise<(() => Promise<void>) | null> => {
  const free = await freeSlots();
  if (free <= 0) return null;
  const next = await prisma.prospectPack.findMany({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' }, take: free, select: { id: true } });
  if (!next.some((p) => p.id === pack.id)) return null;
  const won = await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'queued' }, data: { status: 'building', startedAt: new Date() } });
  return won.count === 0 ? null : startJob(pack);
};
