import { prisma } from '../../src/lib/db';
import { writeFileSync } from 'node:fs';
async function main() {
  for (const id of process.argv.slice(2)) {
    const s = await prisma.shortReel.findUniqueOrThrow({ where: { id } });
    writeFileSync(`${process.env.OUT}/${id}.json`, JSON.stringify(s, null, 2));
    const beats = (s as unknown as { beats: { idx: number; role: string; text: string; imagePrompt?: string; photoKey?: string; clipKey?: string }[] }).beats;
    console.log('==', id, JSON.stringify((s as unknown as { inputs: unknown }).inputs).slice(0, 600));
    for (const b of beats ?? []) console.log(`#${b.idx} ${b.role}: ${b.text}\n   IMG: ${b.imagePrompt}\n   keys: ${b.photoKey} ${b.clipKey}`);
  }
}
main().finally(() => prisma.$disconnect());
