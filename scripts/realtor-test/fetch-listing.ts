import { prisma } from '../../src/lib/db';
const main = async () => {
  const zpid = process.argv[2] ?? '14312548';
  const run = await prisma.blitzListingRun.findFirst({ where: { zpid }, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(run ? { id: run.id, facts: run.facts, photoTags: run.photoTags, n: (run.candidates as unknown[]).length, candidates: run.candidates } : null));
  await prisma.$disconnect();
};
void main();
