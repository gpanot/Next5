// server-only — never import from a 'use client' file.
// The paid half of a listing video, shared by the app (jobs.ts) and the local CLI:
// gallery → tags → shot plan → script → a clean voiceover per preset.

import type { PhotoTag } from '../../lib/listingPhotos';
import { tagPhotos } from '../listings/photoTags';
import type { CostMeter } from '../metaAds/cost';
import { synthesize, type Narration } from '../shorts/voice';
import { misreadWords, transcribe, WHISPER_USD_PER_MIN } from '../shorts/wordTiming';
import { narrationOf, presetNarration } from './build';
import { PRESET_META, ROOM_BEATS, type RealtorPreset, type VideoLength } from './presets';
import { writeScripts, type RealtorFacts, type ScriptPack } from './script';
import { pairSameRoom, planShots, type GalleryPhoto, type ShotPlan } from './shotPlan';
import { fitBudget, writePresetScript, type PresetScript } from './storyScript';

/** Blitz's two voices. No director's notes: Gemini read them out loud (2026-11-11). */
export const PRESET_VOICES = Object.fromEntries(Object.entries(PRESET_META).map(([k, m]) => [k, m.voice])) as Record<RealtorPreset, string>;

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

/**
 * Any template at any length: its own shot plan (15 s = 3 rooms, no location beat; Auto = up to 11 rooms)
 * and its own words. "3 things I love" shows two photos of the same room per reason.
 */
export const planAndWritePreset = async (
  facts: RealtorFacts, photos: GalleryInput[], preset: RealtorPreset, length: VideoLength,
): Promise<{ plan: ShotPlan; script: PresetScript }> => {
  const tagged = await withTags(photos);
  const top = preset === 'top3';
  const rooms = top ? (length === 'auto' ? 5 : 3) : ROOM_BEATS[length];
  const base = planShots(tagged, { rooms, location: length !== 'short' && !top });
  const plan = top && length !== 'short' ? pairSameRoom(base, tagged) : base;
  return fitBudget(plan, await writePresetScript(facts, preset, length, plan), preset, length);
};

/** Records the narration, listens to the whole take, and records again when words were added or skipped. */
export const cleanVoice = async (script: ScriptPack, preset: RealtorPreset, meter: CostMeter): Promise<Narration> =>
  cleanVoiceText(narrationOf(script, preset), PRESET_VOICES[preset], meter);

export const cleanPresetVoice = (script: PresetScript, preset: RealtorPreset, meter: CostMeter): Promise<Narration> =>
  cleanVoiceText(presetNarration(script), PRESET_VOICES[preset], meter);

const cleanVoiceText = async (text: string, voice: string, meter: CostMeter): Promise<Narration> => {
  let best: { n: Narration; errors: number } | null = null;
  for (let i = 0; i < VOICE_TRIES; i++) {
    const n = await synthesize(text, { voice }, meter);
    const { extra, missing } = misreadWords(text, await transcribe(n.wav, text));
    meter.add('Full-take check (Whisper)', Math.round((n.durationS / 60) * WHISPER_USD_PER_MIN * 1_000_000));
    const errors = extra.length + missing.length;
    if (!best || errors < best.errors) best = { n, errors };
    if (errors === 0) break;
    console.warn(`[realtor-video] ${voice} take ${i + 1} misread: ${[...extra.map((w) => `+${w}`), ...missing.map((w) => `-${w}`)].join(' ')}`);
  }
  return best!.n;
};
