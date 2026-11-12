// Turns a shot plan + script + recorded voice into Remotion props for the voiced presets.
// Beat i starts on the first word of its first sentence (words are aligned 1:1 to script tokens by the TTS pipeline).

import type { ListingFacts, RoomTag } from '../../remotion/realtor/types';
import type { SfxCue, SpokenWord, VoicedBeat, VoicedProps } from '../../remotion/realtor/voiced';
import { LENGTH_FLOOR_S, MAX_DURATION_S, PRESET_META, type MusicTrack, type RealtorPreset as AnyPreset, type VideoLength } from './presets';
import { priceLabel, type RealtorFacts, type ScriptPack } from './script';
import type { ShotPlan } from './shotPlan';
import type { PresetScript } from './storyScript';

/** The presets the app offers today (jobs.ts); the CLI can render every one in presets.ts. */
export type AppPreset = 'editorial' | 'rate';
export type { AppPreset as RealtorPreset };

/** Where the shared music and SFX live: public/ paths (local CLI) or "r2:" keys (app + worker). */
export type RealtorAssets = { music: Record<MusicTrack, string>; sfx: (name: string) => string };

/** public/realtor/… — the local CLI renders against the public folder. */
export const PUBLIC_ASSETS: RealtorAssets = {
  music: { warm: 'realtor/music/editorial-warm.mp3', pop: 'realtor/music/rate-pop.mp3' },
  sfx: (name) => `realtor/sfx/${name}.mp3`,
};

/** The same files in R2 (scripts/realtor-test/upload-assets.ts); the worker signs "r2:" values before rendering. */
export const R2_ASSET_PREFIX = 'realtor/assets/';
export const R2_ASSETS: RealtorAssets = {
  music: { warm: `r2:${R2_ASSET_PREFIX}music/editorial-warm.mp3`, pop: `r2:${R2_ASSET_PREFIX}music/rate-pop.mp3` },
  sfx: (name) => `r2:${R2_ASSET_PREFIX}sfx/${name}.mp3`,
};

export const MIN_DURATION_S = 25;
const VOICE_OFFSET_S = 0.2;
const TAIL_S = 1.8;

/** The standard 25 s Editorial / Rate words (script.ts) in the shape every template uses. */
export const fromPack = (pack: ScriptPack, preset: 'editorial' | 'rate'): PresetScript => ({
  hookText: pack.hookBottom,
  beats: pack[preset].beats,
  end: pack[preset].end,
  labels: pack.labels.map((l) => (preset === 'rate' ? { kicker: l.rateItem, title: '' } : { kicker: l.kicker, title: l.title })),
  highlights: [],
});

/** The narration, sentence by sentence, in the order it is spoken. */
export const presetNarration = (script: PresetScript): string => [...script.beats.flat(), ...script.end].join(' ');

export const narrationOf = (script: ScriptPack, preset: AnyPreset): string =>
  presetNarration(fromPack(script, preset === 'rate' ? 'rate' : 'editorial'));

const tokenCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Start time of each sentence, from the aligned word list. */
const sentenceStarts = (sentences: string[], words: SpokenWord[]): number[] => {
  let idx = 0;
  return sentences.map((s) => {
    const start = words[Math.min(idx, words.length - 1)]?.startS ?? 0;
    idx += tokenCount(s);
    return start;
  });
};

const ROOM_TAG: Record<string, RoomTag> = { porch: 'porch', exterior: 'exterior', living: 'living', kitchen: 'kitchen', dining: 'kitchen', feature: 'feature', bedroom: 'bedroom', bath: 'bathroom', yard: 'yard', aerial: 'aerial' };

const listingFacts = (facts: RealtorFacts, script: PresetScript, pack?: ScriptPack): ListingFacts => ({
  city: facts.city,
  state: facts.state,
  priceLabel: priceLabel(facts.priceUsd),
  beds: facts.beds,
  baths: facts.baths,
  sqft: facts.sqft,
  hookTop: pack?.hookTop ?? script.labels[0]?.kicker ?? 'FOR SALE',
  hookBottom: script.hookText,
  locationLine: pack?.locationLine ?? script.labels[1]?.kicker ?? facts.city.toUpperCase(),
  ctaKeyword: 'TOUR',
  street: facts.street ?? undefined,
  yearBuilt: facts.yearBuilt ?? undefined,
});

const firstAfter = (words: SpokenWord[], re: RegExp, fromS: number) => words.find((w) => w.startS >= fromS && re.test(w.word))?.startS;

const sfxFor = (preset: AnyPreset, beats: VoicedBeat[], endStartS: number, words: SpokenWord[], assets: RealtorAssets): SfxCue[] => {
  const at = (s: number) => s + VOICE_OFFSET_S;
  const cue = (atS: number, name: string, volume: number): SfxCue => ({ atS, file: assets.sfx(name), volume });
  const comment = firstAfter(words, /^comment$/i, endStartS) ?? endStartS + 2;
  if (preset === 'rate') {
    return [
      ...beats.slice(1).map((b) => cue(at(b.startS), 'click-soft', 0.25)),
      ...beats.flatMap((b) => (b.checkAtS === undefined ? [] : [cue(at(b.checkAtS), 'ping', 0.35)])),
      cue(at(endStartS), 'whoosh-short', 0.3),
      cue(at(firstAfter(words, /^number/i, endStartS) ?? endStartS), 'pop', 0.4),
      cue(at(comment), 'sparkle', 0.3),
    ];
  }
  if (PRESET_META[preset].music === 'pop') {
    return [
      ...beats.slice(1).map((b) => cue(at(b.startS), preset === 'alert' ? 'pop' : 'click-soft', 0.28)),
      cue(at(endStartS), 'whoosh-short', 0.3),
      cue(at(comment), 'sparkle', 0.3),
    ];
  }
  return [
    ...beats.slice(1).map((b) => cue(at(b.startS) - 0.25, 'whoosh-short', 0.12)),
    cue(at(endStartS) - 0.3, 'whoosh-cinematic', 0.2),
    cue(at(endStartS) + 1.2, 'sparkle', 0.25),
    cue(at(comment), 'chime', 0.2),
  ];
};

type PresetInput = {
  preset: AnyPreset;
  length: VideoLength;
  facts: RealtorFacts;
  plan: ShotPlan;
  script: PresetScript;
  words: SpokenWord[];
  voiceDurationS: number;
  voicePath: string;
  assets: RealtorAssets;
  pack?: ScriptPack;
};

export const buildPresetProps = ({ preset, length, facts, plan, script, words, voiceDurationS, voicePath, assets, pack }: PresetInput): VoicedProps => {
  const groups = script.beats;
  const starts = sentenceStarts([...groups.flat(), ...script.end], words);
  let s = 0;
  const rate = preset === 'rate';
  const beats: VoicedBeat[] = plan.beats.map((shot, i) => {
    const startS = i === 0 ? 0 : starts[s];
    s += groups[i]?.length ?? 0;
    const label = script.labels[i] ?? { kicker: '', title: '' };
    return {
      photo: shot.url,
      photo2: shot.url2,
      room: ROOM_TAG[shot.tag] ?? 'living',
      kicker: label.kicker,
      title: label.title,
      note: label.note,
      startS,
      checkAtS: rate && shot.role === 'room' ? firstAfter(words, /^check/i, startS) : undefined,
    };
  });
  const endStartS = starts[s] ?? voiceDurationS - 3;
  const durationS = Math.max(LENGTH_FLOOR_S[length], Math.ceil(voiceDurationS + VOICE_OFFSET_S + TAIL_S));
  if (durationS > MAX_DURATION_S) console.warn(`[realtor-video] ${preset}/${length} runs ${durationS} s, over the ${MAX_DURATION_S} s cap`);
  return {
    facts: listingFacts(facts, script, pack),
    beats,
    endStartS,
    endPhoto: plan.end.url,
    voice: voicePath,
    music: assets.music[PRESET_META[preset].music],
    words,
    sfx: sfxFor(preset, beats, endStartS, words, assets),
    durationS,
  };
};

type BuildInput = Omit<PresetInput, 'script' | 'length' | 'pack'> & { script: ScriptPack };

/** The standard 25 s Editorial / Rate video (the app's current flow; other presets go through buildPresetProps). */
export const buildVoicedProps = ({ preset, script, ...rest }: BuildInput): VoicedProps => {
  const p = preset === 'rate' ? 'rate' : 'editorial';
  return buildPresetProps({ ...rest, preset: p, length: 'standard', script: fromPack(script, p), pack: script });
};
