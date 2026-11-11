// server-only — never import from a 'use client' file.
// Gemini 3.6 Flash reads the reference shot by shot from 3 stills per shot (25/50/75 %) plus what is said in it:
// layout, framing, face size, movement, recording direction, on-screen text, overlays, and the reel's overall look.

import { mkdir, readFile } from 'fs/promises';
import { GEMINI_FLASH, openRouterChat, parseJsonObject, type OpenRouterMessage } from '../ai/openrouter';
import type { CopyViralShot, CopyViralShotReading, CopyViralStyle } from '../../types/admin/copyViral';
import { extractFrame } from './media';
import { projectFile } from './store';

const SHARES = [0.25, 0.5, 0.75];

const PROMPT = `You study a viral vertical reel so a creator can re-record it shot by shot, as close as possible.
You get each shot's stills (3 per shot, in time order) and what is said in it.
Reply with JSON only, this shape (flat objects, every key present, "" when nothing):
{"shots":[{"shot":1,"layout":"full_cam|split|text_card|broll|screen|other","framing":"shot size, angle, where the person sits","face_pct":20,
"movement":"static|punch_in|push_in|handheld|pan","direction":"how to record it: pose, gestures, expression, props, place, light. Max 25 words",
"on_screen_text":"exact words burned on screen that are NOT the spoken caption, as they read at the END of the shot, one screen line per line separated by \\n, no descriptions or brackets","overlays":"boards, screenshots, logos, b-roll over the camera",
"background":"ONLY when the person is cut out over a picture or video (green screen): that picture as a prompt for an image generator (place, objects, light, no people). Otherwise \"\""}],
"caption_font":"font feel: condensed sans, serif, rounded...","caption_case":"upper|lower|sentence","caption_position":"where captions sit",
"caption_words_per_line":3,"caption_highlight":"how the said word is marked","colors":"main colors, hex if clear",
"grade":"light and color look","transitions":"hard cuts, zooms, whooshes...","hook":"what the first 2 s do to stop the scroll",
"cta":"how it ends and what it asks","music":"what you can tell about music","sound_effects":"what you can tell","notes":"anything else that makes it work"}
face_pct = face height as % of frame height (0 when no face). One entry per shot, same order.
Shots of the same scene are one continuous picture of the reel, split by sentences: give them the same layout and background.`;

const toDataUrl = async (file: string) => `data:image/jpeg;base64,${(await readFile(file)).toString('base64')}`;

const shotStills = async (id: string, reference: string, shot: CopyViralShot): Promise<string[]> =>
  Promise.all(SHARES.map(async (share) => {
    const file = projectFile(id, `stills/shot-${shot.startMs}-${shot.endMs}-${share * 100}.jpg`);
    await extractFrame(projectFile(id, reference), Math.round(shot.startMs + (shot.endMs - shot.startMs) * share), file, 360);
    return toDataUrl(file);
  }));

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);

const toReading = (raw: Record<string, unknown> | undefined): CopyViralShotReading => ({
  layout: str(raw?.layout) || 'other',
  framing: str(raw?.framing),
  facePct: num(raw?.face_pct),
  movement: str(raw?.movement),
  direction: str(raw?.direction),
  onScreenText: str(raw?.on_screen_text),
  overlays: str(raw?.overlays),
  background: str(raw?.background),
});

const toStyle = (raw: Record<string, unknown>): CopyViralStyle => ({
  captionFont: str(raw.caption_font),
  captionCase: str(raw.caption_case),
  captionPosition: str(raw.caption_position),
  captionWordsPerLine: num(raw.caption_words_per_line) || 3,
  captionHighlight: str(raw.caption_highlight),
  colors: str(raw.colors),
  grade: str(raw.grade),
  transitions: str(raw.transitions),
  hook: str(raw.hook),
  cta: str(raw.cta),
  music: str(raw.music),
  soundEffects: str(raw.sound_effects),
  notes: str(raw.notes),
});

/** One reading per shot (same order) and the reel's style. Throws when Gemini gives nothing usable. */
export const readShots = async (id: string, reference: string, shots: CopyViralShot[]) => {
  await mkdir(projectFile(id, 'stills'), { recursive: true });
  const stills = await Promise.all(shots.map((s) => shotStills(id, reference, s)));
  const content: Exclude<OpenRouterMessage['content'], string> = [{ type: 'text', text: PROMPT }];
  shots.forEach((s, i) => {
    const seconds = `${(s.startMs / 1000).toFixed(1)}-${(s.endMs / 1000).toFixed(1)} s`;
    content.push({ type: 'text', text: `Shot ${i + 1} (scene ${s.sequence + 1}, ${seconds}). Said: "${s.transcript || '(nothing)'}"` });
    for (const url of stills[i]) content.push({ type: 'image_url', image_url: { url } });
  });
  // Flex only (AI Studio, then Vertex): half the standard price; a rare failure is a retry from the tab
  const reply = await openRouterChat([{ role: 'user', content }], { model: GEMINI_FLASH, maxTokens: 8000, temperature: 0.2, reasoning: 'low', timeoutMs: 150_000, flexOnly: true });
  const json = parseJsonObject(reply);
  const rawShots = Array.isArray(json?.shots) ? (json.shots as Record<string, unknown>[]) : null;
  if (!reply) throw new Error('Gemini gave no answer (OpenRouter error: see the dev server log). Try again.');
  if (!json || !rawShots) throw new Error('Gemini answered in a shape we cannot use. Try again.');
  const readings = shots.map((_, i) => toReading(rawShots[i]));
  // one scene = one picture behind the person: its first shot's description wins
  const sceneBackground = (seq: number) => readings[shots.findIndex((s) => s.sequence === seq)]?.background ?? '';
  return { readings: readings.map((r, i) => ({ ...r, background: sceneBackground(shots[i].sequence) })), style: toStyle(json) };
};
