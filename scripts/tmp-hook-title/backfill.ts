// One-off (2026-10-20): gives open Blitz idea cards made before the hook title their written hook (from the Script Bank
// story: the hook of the card's archetype that is not among its other hooks) and their title (labs/hookTitle.ts).
// Dry run by default (prints picks, writes nothing). Run:
//   npx tsx --env-file=.env.local scripts/tmp-hook-title/backfill.ts [--write] [--workspace <id>] [--limit <n>]
import type { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/db';
import { mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { withHookTitle } from '../../src/server/labs/hookTitle';
import { captionBox, titleBox } from '../../src/server/labs/hookTitlePlace';
import { backgroundJpeg } from '../../src/server/slideshow/core/captionFit';
import type { DeckItem } from '../../src/server/slideshow/core/deckAssembly';

type Hook = { archetype: string; text: string };
type Bank = { audiences: Array<{ stories: Array<{ id: string; hooks: Hook[] }> }> };

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** The card's written hook: its story's hook of its archetype that is not one of its other hooks. */
const writtenHook = (card: DeckItem, banks: Bank[]): string | null => {
  const others = new Set((card.script?.otherHooks ?? []).map((h) => h.text));
  for (const bank of banks) {
    const story = bank.audiences.flatMap((a) => a.stories).find((s) => s.id === card.script?.storyId);
    if (!story || ![...others].every((t) => story.hooks.some((h) => h.text === t))) continue;
    const hook = story.hooks.find((h) => h.archetype === card.archetype && !others.has(h.text));
    if (hook) return hook.text;
  }
  return null;
};

/** The hook frame with the boxes drawn (half size): title (red), hook caption (cyan), next caption (lime). */
async function preview(card: DeckItem, out: string): Promise<void> {
  const frame = await backgroundJpeg(card.shots[0]!);
  const t = card.hookTitle;
  if (!frame || !t) return;
  const tb = titleBox(t.text, t.style);
  const rect = (b: { x: number; y: number; w: number; h: number }, color: string) =>
    `<rect x="${b.x / 2}" y="${b.y / 2}" width="${b.w / 2}" height="${b.h / 2}" fill="none" stroke="${color}" stroke-width="3"/>`;
  const [hook, next] = card.shots;
  const svg = `<svg width="540" height="960" xmlns="http://www.w3.org/2000/svg">${rect({ ...tb, y: t.positionY * 1920 - tb.h }, 'red')}${rect(captionBox(hook!.text, hook!.positionY ?? 0.5), 'cyan')}${next ? rect(captionBox(next.text, next.positionY ?? 0.5), 'lime') : ''}</svg>`;
  await sharp(frame).composite([{ input: Buffer.from(svg) }]).jpeg().toFile(out);
}

(async () => {
  const out = arg('--preview');
  if (out) await mkdir(out, { recursive: true });
  const write = process.argv.includes('--write');
  const workspaceId = arg('--workspace');
  const limit = Number(arg('--limit') ?? 50);
  const banks = (await prisma.blitzScriptBank.findMany({ where: { status: 'ready' }, select: { content: true } })).map((b) => b.content as unknown as Bank).filter((b) => b?.audiences);
  const rows = await prisma.slideshowVariant.findMany({
    where: { status: { in: ['proposed', 'kept'] }, plannedAt: { gte: new Date() }, ...(workspaceId ? { workspaceId } : {}) },
    select: { id: true, workspaceId: true, plan: true },
    orderBy: { plannedAt: 'asc' },
    take: limit,
  });
  for (const row of rows) {
    const plan = row.plan as { card?: DeckItem };
    const card = plan.card;
    if (!card || card.hookTitle || card.finishing) continue;
    const hookLine = card.hookLine ?? writtenHook(card, banks);
    if (!hookLine) { console.log(`${row.id}: no written hook found, skipped`); continue; }
    const titled = await withHookTitle({ ...card, hookLine }, row.workspaceId);
    console.log(`${row.id}: "${hookLine}" → ${titled.hookTitle?.style ?? 'none'} at ${titled.hookTitle?.positionY ?? '-'} (${titled.hookTitleReason ?? ''})`);
    if (out) await preview(titled, path.join(out, `${row.id}.jpg`));
    if (!write || !titled.hookTitle) continue;
    await prisma.$executeRaw`
      UPDATE slideshow_variants
      SET plan = jsonb_set(jsonb_set(jsonb_set(plan, '{card,hookLine}', ${JSON.stringify(hookLine)}::jsonb), '{card,hookTitle}', ${JSON.stringify(titled.hookTitle)}::jsonb), '{card,hookTitleReason}', ${JSON.stringify(titled.hookTitleReason ?? '')}::jsonb)
      WHERE id = ${row.id} AND plan ? 'card'`;
  }
  await prisma.$disconnect();
})().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
