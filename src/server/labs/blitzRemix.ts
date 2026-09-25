// server-only — "Remix it!" for the Blitz Lab green-screen editor.
//
// One or more layers (caption, meme video, background, audio) are locked. The model gets a
// compact catalog of the unlocked layers' assets — ranked by vector similarity to the locked
// layers, plus random picks (blitzRemixCandidates.ts) — and picks a new combination around
// the locked layers that is more likely to be viral or engaging.

import { openRouterChat, parseJsonObject } from '../ai/openrouter';
import { clip, loadCandidates, type AssetType, type Candidate } from './blitzRemixCandidates';

export const BLITZ_REMIX_MODEL = 'google/gemini-3.5-flash-lite';

export const REMIX_LAYERS = ['caption', 'overlay', 'background', 'audio'] as const;
export type RemixLayer = (typeof REMIX_LAYERS)[number];

export type RemixInput = {
  locked: RemixLayer[];
  captionText: string;
  overlayKey: string;
  backgroundKey: string;
  audioKey?: string;
  businessText?: string;
  hint?: string;
};

export type RemixResult = {
  locked: RemixLayer[];
  captionText: string;
  overlayKey: string;
  backgroundKey: string;
  audioKey: string | null;
  reason: string;
  /** True when the candidates were ranked with the vector index. */
  usedVectors: boolean;
};

const LAYER_TYPE: Partial<Record<RemixLayer, AssetType>> = { overlay: 'OVERLAY', background: 'BACKGROUND', audio: 'AUDIO' };

const SYSTEM_PROMPT = [
  'You are a short-form video editor who makes viral TikTok and Reels "Blitz" videos for US realtors and TikTok Shop sellers.',
  'A Blitz video has 4 layers: a green-screen MEME video on top of a BACKGROUND, a short CAPTION on screen, and optional AUDIO (music).',
  'Your job: keep every LOCKED layer exactly as it is, and find a NEW combination of the unlocked layers that is more viral or engaging.',
  'What makes it work: the meme reaction must be the punchline to the caption. The background sets the scene. The audio matches the meme energy.',
  '"fit" is how close an asset is in meaning to the locked layers (higher = closer). Use it as a hint, not a rule: a surprising contrast can be funnier.',
  'If the meme has speech that carries the joke, you may pick "none" for audio.',
  'Change every unlocked layer when you can. If the caption is unlocked, write a clearly new caption, not a small edit.',
  'Caption rules: 3rd-grade words, one relatable moment, max 14 words, no hashtags, no emojis, never invent prices, numbers or addresses.',
  'Use only ids from the catalog. For a locked layer, return its current id (or the current caption). Return JSON only:',
  '{ "overlay": "m…", "background": "b…", "audio": "a…" | "none", "caption": "…", "reason": "one short sentence on why this combo works" }',
].join('\n');

function buildUserPrompt(input: RemixInput, cands: Candidate[]): string {
  const aliasOf = (key: string | undefined) => cands.find((c) => c.r2Key === key)?.alias ?? 'none';
  const section = (type: AssetType, title: string) =>
    [`## ${title}`, ...cands.filter((c) => c.type === type).map((c) => `${c.alias} | ${c.line}`)].join('\n');
  const unlocked = REMIX_LAYERS.filter((l) => !input.locked.includes(l));
  return [
    `LOCKED LAYERS: ${input.locked.join(', ')}`,
    `UNLOCKED LAYERS (change these): ${unlocked.join(', ')}`,
    'CURRENT VIDEO:',
    `- caption: "${input.captionText}"`,
    `- overlay (meme): ${aliasOf(input.overlayKey)}`,
    `- background: ${aliasOf(input.backgroundKey)}`,
    `- audio: ${aliasOf(input.audioKey)}`,
    input.businessText ? `Business shown on the video: "${clip(input.businessText, 120)}"` : null,
    input.hint?.trim() ? `Extra direction from the user: ${clip(input.hint.trim(), 300)}` : null,
    '',
    section('OVERLAY', 'MEME VIDEOS'),
    section('BACKGROUND', 'BACKGROUNDS'),
    section('AUDIO', 'AUDIO'),
  ].filter((l) => l !== null).join('\n');
}

/** Maps the model's aliases back to keys. Locked layers and bad ids keep the current value. */
function resolve(input: RemixInput, cands: Candidate[], raw: Record<string, unknown>): Omit<RemixResult, 'usedVectors'> {
  const isLocked = (l: RemixLayer) => input.locked.includes(l);
  const pick = (type: AssetType, alias: unknown, current: string | undefined) =>
    cands.find((c) => c.type === type && c.alias === alias)?.r2Key ?? current;
  const caption = typeof raw.caption === 'string' ? raw.caption.trim() : '';
  const audio = raw.audio === 'none' ? null : pick('AUDIO', raw.audio, input.audioKey) ?? null;
  return {
    locked: input.locked,
    captionText: isLocked('caption') || !caption ? input.captionText : caption,
    overlayKey: isLocked('overlay') ? input.overlayKey : pick('OVERLAY', raw.overlay, input.overlayKey)!,
    backgroundKey: isLocked('background') ? input.backgroundKey : pick('BACKGROUND', raw.background, input.backgroundKey)!,
    audioKey: isLocked('audio') ? input.audioKey ?? null : audio,
    reason: typeof raw.reason === 'string' ? clip(raw.reason.trim(), 240) : '',
  };
}

/** Runs one remix. Returns null when the model call fails or returns nothing usable. */
export async function remixBlitz(input: RemixInput): Promise<RemixResult | null> {
  const lockedTypes = new Set(input.locked.map((l) => LAYER_TYPE[l]).filter((t): t is AssetType => Boolean(t)));
  const { cands, usedVectors } = await loadCandidates({
    currentKeys: { OVERLAY: input.overlayKey, BACKGROUND: input.backgroundKey, AUDIO: input.audioKey },
    lockedTypes,
    lockedCaption: input.locked.includes('caption') ? input.captionText : null,
  });
  const text = await openRouterChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input, cands) },
    ],
    { model: BLITZ_REMIX_MODEL, maxTokens: 400, temperature: 1, timeoutMs: 30_000 },
  );
  const raw = parseJsonObject(text);
  if (!raw) return null;
  return { ...resolve(input, cands, raw), usedVectors };
}
