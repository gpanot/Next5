import { prisma } from '../../src/lib/db';
(async () => {
  const rows = await prisma.blitzProject.findMany({
    where: { renderStatus: 'COMPLETED', template: { type: 'CAROUSEL' } },
    orderBy: { createdAt: 'desc' }, take: 8, include: { template: { select: { name: true, fps: true } }, workspace: { select: { name: true } } },
  });
  for (const r of rows) {
    const a = r.currentAssets as { slides?: { text: string; backgroundKey?: string; durationSec?: number }[]; audioKey?: string; durationSeconds?: number };
    console.log(r.id, r.createdAt.toISOString(), r.workspace?.name, r.template.name, 'dur', a.durationSeconds, 'audio', !!a.audioKey);
    for (const s of a.slides ?? []) console.log('   ', s.durationSec, s.backgroundKey?.slice(-30), '|', s.text.slice(0, 90).replace(/\n/g, ' '));
  }
  await prisma.$disconnect();
})();
