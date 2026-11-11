// server-only — never import from a 'use client' file.
// The paid half of a listing video, shared by the app (jobs.ts) and the local CLI:
// gallery → tags → shot plan → script → a clean voiceover per preset.

import type { PhotoTag } from '../../lib/listingPhotos';
import { tagPhotos } from '../listings/photoTags';
import type { CostMeter } from '../metaAds/cost';
import { synthesize, type Narration } from '../shorts/voice';
import { misreadWords, transcribe, WHISPER_USD_PER_MIN } from '../shorts/wordTiming';
import { narrationOf, type RealtorPreset } from './build';
import { writeScripts, type RealtorFacts, type ScriptPack } from './script';
import { planShots, type GalleryPhoto, type ShotPlan } from './shotPlan';

/** Blitz's two voices. No director's notes: Gemini read them out loud (2026-11-11). */
export const PRESET_VOICES: Record<RealtorPreset, string> = { editorial: 'Sulafat', rate: 'Achird' };

const VOICE_TRIES = 3;

export type GalleryInput = { url: string; thumbUrl: string; tag?: string | null };

/** Tags from the import when it has them; one vision call otherwise. */
const withTags = async (photos: GalleryInput[]): Promise<GalleryPhoto[]> => {
  const missing = photos.some((p) => !p.tag);
  const tags = missing ? await tagPhotos(photos.map((p) => p.thumbUrl)) : photos.map((p) => p.tag as PhotoTag);
  return photos.map((p, i) => ({ url: p.url, thumbUrl: p.thumbUrl, tag: (tags[i] ?? null) as PhotoTag | null }));
};

export const planAndWrite = async (facts: RealtorFacts, photos: GalleryInput[]): Promise<{ plan: ShotPlan; script: ScriptPack }> => {
  const plan = planShots(await withTags(photos));
  return { plan, script: await writeScripts(facts, plan) };
};

/** Records the narration, listens to the whole take, and records again when words were added or skipped. */
export const cleanVoice = async (script: ScriptPack, preset: RealtorPreset, meter: CostMeter): Promise<Narration> => {
  const text = narrationOf(script, preset);
  let best: { n: Narration; errors: number } | null = null;
  for (let i = 0; i < VOICE_TRIES; i++) {
    const n = await synthesize(text, { voice: PRESET_VOICES[preset] }, meter);
    const { extra, missing } = misreadWords(text, await transcribe(n.wav, text));
    meter.add('Full-take check (Whisper)', Math.round((n.durationS / 60) * WHISPER_USD_PER_MIN * 1_000_000));
    const errors = extra.length + missing.length;
    if (!best || errors < best.errors) best = { n, errors };
    if (errors === 0) break;
    console.warn(`[realtor-video] ${preset} take ${i + 1} misread: ${[...extra.map((w) => `+${w}`), ...missing.map((w) => `-${w}`)].join(' ')}`);
  }
  return best!.n;
};
