// server-only — never import from a 'use client' file.
// The Ideas deck plays a Blitz card's real voiceover (2026-10-13): the user taps the mic, the voiceover is written and
// recorded like at render time (blitzVoice.ts) and the render later reuses it. Free for everyone (~$0.02 each);
// workspaces that never paid get FREE_PREVIEWS_PER_DAY new recordings a day. Replays (the cache) never count.

import { HttpError } from '../http';
import { workspaceHasPaid } from '../slideshowCredits/paid';
import { getObject, putObject } from '../storage/objectStore';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { cachedNarration, narrateSlides } from './blitzVoice';
import type { LabAccess } from './labAccess';

export const FREE_PREVIEWS_PER_DAY = 10;
const MAX_SLIDES = 10;
const MAX_TEXT = 200;

export type VoicePreview = { url: string; durations: number[]; lines: string[] };

const quotaKey = (workspaceId: string) => `blitz/voiceovers/quota/${workspaceId}/${new Date().toISOString().slice(0, 10)}.json`;

const usedToday = async (workspaceId: string): Promise<number> => {
  const raw = await getObject(quotaKey(workspaceId)).catch(() => null);
  const used = raw ? Number((JSON.parse(raw.toString('utf8')) as { used?: unknown }).used) : 0;
  return Number.isFinite(used) ? used : 0;
};

const countOne = async (workspaceId: string): Promise<void> => {
  const used = await usedToday(workspaceId);
  await putObject(quotaKey(workspaceId), Buffer.from(JSON.stringify({ used: used + 1 })), 'application/json');
};

const cleanTexts = (texts: unknown): string[] => {
  const ok = Array.isArray(texts) && texts.length > 0 && texts.length <= MAX_SLIDES
    && texts.every((t) => typeof t === 'string' && t.trim().length > 0 && t.length <= MAX_TEXT);
  if (!ok) throw new HttpError(400, 'invalid_slides', 'Every slide needs a short caption.');
  return texts as string[];
};

/** This card's voiceover in `voice`, recorded unless it was before. Throws 429 when a free workspace used its day. */
export async function previewVoiceover(access: LabAccess, slideTexts: unknown, voice: string | undefined): Promise<VoicePreview> {
  const texts = cleanTexts(slideTexts);
  const hit = await cachedNarration(texts, voice, access.workspaceId);
  if (hit) return { url: await blitzBrowserUrl(hit.audioKey), durations: hit.durations, lines: hit.lines };
  const capped = !access.admin && !(await workspaceHasPaid(access.workspaceId));
  if (capped && (await usedToday(access.workspaceId!)) >= FREE_PREVIEWS_PER_DAY) {
    throw new HttpError(429, 'voice_limit', `You heard ${FREE_PREVIEWS_PER_DAY} new voiceovers today. Top up to hear more, or come back tomorrow.`);
  }
  const narration = await narrateSlides(texts.map((text) => ({ text })), voice, access.workspaceId).catch((err: unknown) => {
    console.warn('[blitz/voice-preview] recording failed:', err instanceof Error ? err.message.slice(0, 200) : err);
    throw new HttpError(503, 'voice_busy', 'The voice is busy right now. Tap the mic again in a moment.');
  });
  if (capped) await countOne(access.workspaceId!);
  return { url: await blitzBrowserUrl(narration.audioKey), durations: narration.slides.map((s) => s.durationSec), lines: narration.lines };
}
