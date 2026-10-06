import { prisma } from '../src/lib/db';
import { fitDeckCaptions } from '../src/server/slideshow/core/captionFit';
import type { DeckItem } from '../src/server/slideshow/core/deckAssembly';
async function main() {
  const row = await prisma.slideshowVariant.findFirst({ where: { workspaceId: 'cmuqjc5i40008vufi4x90gb38', engine: 'website' }, orderBy: { createdAt: 'desc' } });
  const card = (row?.plan as { card?: DeckItem })?.card;
  if (!card) throw new Error('no card');
  const t = Date.now();
  const [out] = await fitDeckCaptions([card]);
  console.log('ms', Date.now() - t);
  card.shots.forEach((s, i) => console.log(i, s.mediaKind, (s.assetKey ?? '').slice(-12), 'zone', s.positionY, '-> fit', out!.shots[i]!.positionY, '|', s.text));
}
main().catch((e) => console.error(e)).finally(() => process.exit(0));
