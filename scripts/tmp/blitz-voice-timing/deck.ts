// Deck test (2026-10-14): real Blitz idea cards recorded the way LiveDeck now asks: the top card first, then the next
// one once the top is ready. Prints how long the user waits for each card's voice after it lands on top.
// Run: npx tsx --env-file=.env.local scripts/tmp/blitz-voice-timing/deck.ts [dwellSeconds]
import { prisma } from '../../../src/lib/db';
import { previewVoiceover } from '../../../src/server/labs/blitzVoicePreview';

const DWELL_S = Number(process.argv[2] ?? 4);
const CARDS = 5;

(async () => {
  const rows = await prisma.slideshowVariant.findMany({ where: { engine: 'website', status: 'proposed' }, orderBy: { createdAt: 'desc' }, take: 40 });
  const tag = Date.now().toString(36);
  const decks = rows
    .map((r) => ((r.plan as { card?: { shots?: { text?: string }[] } }).card?.shots ?? []).map((s) => s.text ?? '').filter(Boolean))
    .filter((t) => t.length >= 3)
    .slice(0, CARDS)
    // A tag on the last caption so the cache never answers: every card is a new recording.
    .map((t) => [...t.slice(0, -1), `${t.at(-1)} ${tag}`]);
  console.log(`${decks.length} cards, ${DWELL_S} s on each`);
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const ready: Promise<number>[] = [];
  const start = (i: number) => {
    if (i < decks.length && !ready[i]) ready[i] = previewVoiceover({ admin: true, workspaceId: null }, decks[i], undefined).then(() => now(), (e: unknown) => { console.log(`card ${i + 1} failed: ${e instanceof Error ? e.message : e}`); return Infinity; });
  };
  for (let i = 0; i < decks.length; i++) {
    const onTop = now();
    start(i);
    const at = await ready[i]!;
    start(i + 1);
    const wait = Math.max(0, at - onTop);
    console.log(`card ${i + 1}: on top at ${onTop.toFixed(1)} s, voice ready at ${at.toFixed(1)} s, user waited ${wait.toFixed(1)} s`);
    await new Promise((r) => setTimeout(r, DWELL_S * 1000));
  }
  await Promise.all(ready);
  await prisma.$disconnect();
  process.exit(0);
})();
