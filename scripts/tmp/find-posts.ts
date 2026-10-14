import { prisma } from '../../src/lib/db';
(async () => {
  const rows = await prisma.blitzScheduledPost.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  for (const r of rows) {
    const b = r.renderBody as Record<string, unknown>;
    console.log(r.id, r.createdAt.toISOString(), r.workspaceId, r.status);
    console.log(JSON.stringify({ ...b, set: undefined }).slice(0, 3000));
  }
  await prisma.$disconnect();
})();
