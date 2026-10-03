// server-only — never import from a 'use client' file.
// The Matrix view: a run's site bank (meats × hooks × CTAs) and which slideshows used each part.

import { prisma } from '../../../lib/db';
import type { BankMatrixDto, BankUseDto, SlideshowBankContent } from '../../../types/admin/slideshowBank';

const LIVE = ['scheduled', 'sending', 'processing', 'posted'];

/** `workspaceId` null (admin on a run with no workspace): every slideshow of the site counts. */
export const bankMatrix = async (runId: string, workspaceId: string | null): Promise<BankMatrixDto> => {
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { url: true } });
  const [row, shows] = await Promise.all([
    prisma.slideshowBank.findUnique({ where: { url: run.url } }),
    prisma.autoSlideshow.findMany({
      where: { run: { url: run.url, ...(workspaceId ? { workspaceId } : {}) }, status: { not: 'failed' }, bankHookId: { not: null }, bankMeatId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, runId: true, position: true, bankMeatId: true, bankHookId: true, bankCtaId: true, status: true, createdAt: true, posts: { select: { status: true }, orderBy: { platform: 'desc' } } },
    }),
  ]);
  const used: BankUseDto[] = shows.map((s) => {
    const live = s.posts.find((p) => LIVE.includes(p.status));
    return {
      slideshowId: s.id,
      runId: s.runId,
      position: s.position,
      meatId: s.bankMeatId ?? '',
      hookId: s.bankHookId ?? '',
      ctaId: s.bankCtaId,
      status: s.status,
      post: live ? (live.status === 'posted' ? 'posted' : 'scheduled') : null,
      createdAt: s.createdAt.toISOString(),
    };
  });
  return { bank: row ? (row.content as unknown as SlideshowBankContent) : null, builtAt: row?.createdAt.toISOString() ?? null, used };
};
