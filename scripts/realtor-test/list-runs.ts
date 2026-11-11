import { prisma } from '../../src/lib/db';
const main = async () => {
  const runs = await prisma.blitzListingRun.findMany({ orderBy: { createdAt: 'desc' }, take: 15, select: { zpid: true, address: true, zillowUrl: true, candidates: true } });
  for (const r of runs) console.log(r.zpid, (r.candidates as unknown[]).length, r.address, r.zillowUrl);
  await prisma.$disconnect();
};
void main();
