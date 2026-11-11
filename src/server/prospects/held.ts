// server-only — never import from a 'use client' file.
// A Prospect Pack's run reached its hold (pipeline.ts holdForCast): the site is read. No face is made on its own (2026-11-04):
// the pack waits at 'faces' and the admin creates the avatar first, then approves it (advance.ts approveFaces).

import { prisma } from '../../lib/db';

/** Never throws: moves the pack to the face step. */
export const onRunHeld = async (runId: string): Promise<void> => {
  const pack = await prisma.prospectPack.findFirst({ where: { brandRunId: runId }, select: { id: true } });
  if (!pack) return;
  await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'building' }, data: { status: 'faces', facesAt: new Date() } });
};
