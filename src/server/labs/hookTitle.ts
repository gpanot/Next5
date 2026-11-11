// server-only — never import from a 'use client' file.
// The hook title of a Blitz card (remotion/hookTitle.ts, 2026-10-20): the written hook, fixed on screen like a TikTok
// title over the hook shot and ~1 s of the next, while the narrated captions run in the Default look under it.
// Set when the card is finished (ideaFinish.ts), once its hook photo and captions are final:
//   1. Gemini picks the look on the hook's frame: TikTok Red or White box (as the Admin Shorts hook, shorts/hookFit.ts),
//      and says whether the other one would read as well;
//   2. a guard keeps one look from taking most of the workspace's recent titles: a card whose other look reads as well
//      takes it when its pick already has over MAX_SHARE;
//   3. geometry places it (hookTitlePlace.ts) off the frame's heads and the captions.
// A failed pick falls back to TikTok Red; a frame with no known heads is placed against the captions alone.

import { prisma } from '../../lib/db';
import { HOOK_TITLE_STYLE_IDS, isHookTitleStyleId, type HookTitleStyleId } from '../../types/hookStyle';
import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { backgroundJpeg } from '../slideshow/core/captionFit';
import { loadFits, regionsKey, type SavedFits } from '../slideshow/core/captionFitCache';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { BLITZ_AUTOFIT_MODEL } from './blitzAutoFit';
import { detectBackgroundRegions, type Box } from './blitzAutoFitGeometry';
import { captionBox, placeTitle, titleBox } from './hookTitlePlace';

const DEFAULT_STYLE: HookTitleStyleId = 'tiktok-red';
/** Above this share of the recent titles, a look gives way where the other reads as well. */
const MAX_SHARE = 0.6;
/** Recent titles the guard counts (about two weeks of ideas). */
const RECENT = 14;
/** Where a story shot's caption sits when it has no height of its own (the slideshow default). */
const STORY_Y = 0.5;

const STYLE_PROMPT = [
  'You style the hook title on the first frame of a 9:16 TikTok video. The title stays on screen ~4 seconds, over the photo,',
  'with smaller white captions under it. Pick ONE of two looks:',
  '- "tiktok-red": white capital letters on a bright red bar behind each line. Bold, energetic, the popular viral-hook look.',
  '  Best on busy, colourful or bright photos, and for punchy or surprising hooks.',
  '- "white-box": dark text in a clean white box. Calm, editorial, very readable.',
  '  Best on dark or red-heavy photos (where red would clash or vanish), and for calm, how-to or premium topics.',
  'Choose the one that reads best on THIS photo and fits the hook. "otherWorks": true when the other look would read just as well here.',
  'Return JSON only: { "style": "tiktok-red" | "white-box", "otherWorks": true | false, "reason": "one short sentence" }',
].join('\n');

type Pick = { style: HookTitleStyleId; otherWorks: boolean; reason: string };

/** Gemini's look for the title on this frame. The default look when the call fails. */
async function pickStyle(frameUri: string, title: string): Promise<Pick> {
  const text = await openRouterChat(
    [{ role: 'user', content: [{ type: 'image_url', image_url: { url: frameUri } }, { type: 'text', text: `${STYLE_PROMPT}\n\nHook title: "${title}"` }] }],
    { model: BLITZ_AUTOFIT_MODEL, maxTokens: 200, temperature: 0.2, timeoutMs: 30_000, reasoning: 'minimal' },
  ).catch(() => null);
  const raw = parseJsonObject(text);
  if (!isHookTitleStyleId(raw?.style)) return { style: DEFAULT_STYLE, otherWorks: true, reason: 'Default look (no pick).' };
  return { style: raw.style, otherWorks: raw.otherWorks === true, reason: typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 200) : '' };
}

/** Looks given in this process, newest first, per workspace: a batch's cards finish at once, before any is saved. */
const given = new Map<string, HookTitleStyleId[]>();

/** Notes a look given to a card of the workspace (the guard counts it at once). */
const remember = (workspaceId: string | null, style: HookTitleStyleId) => {
  const key = workspaceId ?? '';
  given.set(key, [style, ...(given.get(key) ?? [])].slice(0, RECENT));
};

/** Looks of the workspace's latest titled ideas, newest first: those given in this process, then the saved ones. */
const recentNow = (workspaceId: string | null, saved: HookTitleStyleId[]): HookTitleStyleId[] =>
  [...(given.get(workspaceId ?? '') ?? []), ...saved].slice(0, RECENT);

/** Looks of the workspace's latest saved titled ideas, newest first. */
async function recentStyles(workspaceId: string | null): Promise<HookTitleStyleId[]> {
  if (!workspaceId) return [];
  const rows = await prisma.$queryRaw<Array<{ style: string | null }>>`
    SELECT plan->'card'->'hookTitle'->>'style' AS style FROM slideshow_variants
    WHERE workspace_id = ${workspaceId} AND plan->'card' ? 'hookTitle'
    ORDER BY updated_at DESC LIMIT ${RECENT}`;
  return rows.flatMap((r) => (isHookTitleStyleId(r.style) ? [r.style] : []));
}

/** The pick, switched to the other look when its own already has too many of the recent titles and the other reads as well. */
export function balanced(pick: Pick, recent: HookTitleStyleId[]): Pick {
  if (!pick.otherWorks || recent.length === 0) return pick;
  const share = (recent.filter((s) => s === pick.style).length + 1) / (recent.length + 1);
  if (share <= MAX_SHARE) return pick;
  const other = HOOK_TITLE_STYLE_IDS.find((s) => s !== pick.style)!;
  return { style: other, otherWorks: true, reason: `${pick.reason} Switched for variety: both looks read well here.`.trim() };
}

/** The hook frame's heads: saved by the caption fit, else found now (none when that fails). */
async function headsOf(card: DeckItem, frameUri: string): Promise<Box[]> {
  const hook = card.shots[0]!;
  const saved = hook.assetId ? (await loadFits([hook.assetId])).get(hook.assetId) : undefined;
  const known = saved?.regions[regionsKey(hook.trimStart ?? 0)];
  if (known) return known.faces;
  return detectBackgroundRegions(frameUri).then((r) => r.faces).catch(() => []);
}

/** The card with its title at its height for `style`, off the heads and the hook and next captions (the hook caption
 *  moves under the title when the two can only clear the heads together). */
export function placedTitle(card: DeckItem, text: string, style: HookTitleStyleId, faces: Box[]): DeckItem {
  const [hook, next] = card.shots;
  const placed = placeTitle({
    title: titleBox(text, style),
    hookCaption: captionBox(hook!.text, hook!.positionY ?? STORY_Y),
    nextCaption: next ? captionBox(next.text, next.positionY ?? STORY_Y) : null,
    faces,
  });
  const shots = placed.hookCaptionY == null ? card.shots : card.shots.map((s, i) => (i === 0 ? { ...s, positionY: placed.hookCaptionY } : s));
  return { ...card, shots, hookTitle: { text, style, positionY: placed.positionY } };
}

/** The card with its hook title (look picked, placed), or as it is when it has no written hook or no hook frame. */
export async function withHookTitle(card: DeckItem, workspaceId: string | null): Promise<DeckItem> {
  const text = card.hookLine?.trim();
  const hook = card.shots[0];
  if (!text || !hook) return card;
  const frame = await backgroundJpeg(hook).catch(() => null);
  if (!frame) return card;
  const frameUri = `data:image/jpeg;base64,${frame.toString('base64')}`;
  const [pick, recent, faces] = await Promise.all([pickStyle(frameUri, text), recentStyles(workspaceId), headsOf(card, frameUri)]);
  // No await between the guard and `remember`: cards finishing at once each count the ones before them.
  const { style, reason } = balanced(pick, recentNow(workspaceId, recent));
  remember(workspaceId, style);
  return { ...placedTitle(card, text, style, faces), hookTitleReason: reason };
}

/** After a hook swap or a caption move: the same look, placed again for the card as it is now (no model call). */
export async function replaceHookTitle(card: DeckItem): Promise<DeckItem> {
  const text = card.hookLine?.trim();
  if (!card.hookTitle || !text) return card;
  const hook = card.shots[0]!;
  const saved = hook.assetId ? (await loadFits([hook.assetId]).catch(() => new Map<string, SavedFits>())).get(hook.assetId) : undefined;
  const faces: Box[] = saved?.regions[regionsKey(hook.trimStart ?? 0)]?.faces ?? [];
  return placedTitle(card, text, card.hookTitle.style, faces);
}
