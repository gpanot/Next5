import { prisma } from '../../src/lib/db';
(async () => {
  const rows = await prisma.slideshowVariant.findMany({ where: { engine: 'website' }, orderBy: { createdAt: 'desc' }, take: 4 });
  for (const r of rows) {
    const plan = r.plan as { card?: Record<string, unknown> };
    console.log(r.id, r.status, r.createdAt.toISOString(), r.workspaceId);
    console.log(JSON.stringify(plan.card).slice(0, 2500));
  }
  await prisma.$disconnect();
})();
