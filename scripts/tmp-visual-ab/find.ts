import { prisma } from '../../src/lib/db';
async function main() {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: { OR: [{ url: { contains: 'eql', mode: 'insensitive' } }, { url: { contains: 'porsche', mode: 'insensitive' } }] },
    orderBy: { createdAt: 'desc' }, select: { id: true, url: true, workspaceId: true, createdAt: true, profile: true },
  });
  for (const r of runs) { const p = r.profile as Record<string, unknown> | null; console.log(r.createdAt.toISOString(), r.url, r.workspaceId, p ? JSON.stringify({ a: p.audience, t: p.tone, s: p.slideshowStyle, h: p.heroImageUrl, pal: p.palette }) : 'no profile'); }
  const ws = runs.map((r) => r.workspaceId).filter(Boolean) as string[];
  const shorts = await prisma.shortReel.findMany({ where: { workspaceId: { in: ws } }, orderBy: { createdAt: 'desc' }, select: { id: true, workspaceId: true, createdAt: true, status: true, videoModel: true } as never });
  console.log(shorts);
  const banks = await prisma.slideshowBank.findMany({ where: { url: { in: runs.map((r) => r.url) } }, select: { url: true } });
  console.log('banks', banks.map((b) => b.url));
}
main().finally(() => prisma.$disconnect());
