// Turns a shot plan + script + recorded voice into Remotion props for the voiced presets.
// Beat i starts on the first word of its first sentence (words are aligned 1:1 to script tokens by the TTS pipeline).

import type { ListingFacts, RoomTag } from '../../remotion/realtor/types';
import type { SfxCue, SpokenWord, VoicedBeat, VoicedProps } from '../../remotion/realtor/voiced';
import { priceLabel, type RealtorFacts, type ScriptPack } from './script';
import type { ShotPlan } from './shotPlan';

export type RealtorPreset = 'editorial' | 'rate';

/** Where the shared music and SFX live: public/ paths (local CLI) or "r2:" keys (app + worker). */
export type RealtorAssets = { music: Record<RealtorPreset, string>; sfx: (name: string) => string };

/** public/realtor/… — the local CLI renders against the public folder. */
export const PUBLIC_ASSETS: RealtorAssets = {
  music: { editorial: 'realtor/music/editorial-warm.mp3', rate: 'realtor/music/rate-pop.mp3' },
  sfx: (name) => `realtor/sfx/${name}.mp3`,
};

/** The same files in R2 (scripts/realtor-test/upload-assets.ts); the worker signs "r2:" values before rendering. */
export const R2_ASSET_PREFIX = 'realtor/assets/';
export const R2_ASSETS: RealtorAssets = {
  music: { editorial: `r2:${R2_ASSET_PREFIX}music/editorial-warm.mp3`, rate: `r2:${R2_ASSET_PREFIX}music/rate-pop.mp3` },
  sfx: (name) => `r2:${R2_ASSET_PREFIX}sfx/${name}.mp3`,
};

export const MIN_DURATION_S = 25;
const VOICE_OFFSET_S = 0.2;
const TAIL_S = 1.8;

/** The narration, sentence by sentence, in the order it is spoken. */
export const narrationOf = (script: ScriptPack, preset: RealtorPreset): string =>
  [...script[preset].beats.flat(), ...script[preset].end].join(' ');

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

const listingFacts = (facts: RealtorFacts, script: ScriptPack): ListingFacts => ({
  city: facts.city,
  state: facts.state,
  priceLabel: priceLabel(facts.priceUsd),
  beds: facts.beds,
  baths: facts.baths,
  sqft: facts.sqft,
  hookTop: script.hookTop,
  hookBottom: script.hookBottom,
  locationLine: script.locationLine,
  ctaKeyword: 'TOUR',
});

const firstAfter = (words: SpokenWord[], re: RegExp, fromS: number) => words.find((w) => w.startS >= fromS && re.test(w.word))?.startS;

const sfxFor = (preset: RealtorPreset, beats: VoicedBeat[], endStartS: number, words: SpokenWord[], assets: RealtorAssets): SfxCue[] => {
  const at = (s: number) => s + VOICE_OFFSET_S;
  const cue = (atS: number, name: string, volume: number): SfxCue => ({ atS, file: assets.sfx(name), volume });
  const comment = firstAfter(words, /^comment$/i, endStartS) ?? endStartS + 2;
  if (preset === 'editorial') {
    return [
      ...beats.slice(1).map((b) => cue(at(b.startS) - 0.25, 'whoosh-short', 0.12)),
      cue(at(endStartS) - 0.3, 'whoosh-cinematic', 0.2),
      cue(at(endStartS) + 1.2, 'sparkle', 0.25),
      cue(at(comment), 'chime', 0.2),
    ];
  }
  return [
    ...beats.slice(1).map((b) => cue(at(b.startS), 'click-soft', 0.25)),
    ...beats.flatMap((b) => (b.checkAtS === undefined ? [] : [cue(at(b.checkAtS), 'ping', 0.35)])),
    cue(at(endStartS), 'whoosh-short', 0.3),
    cue(at(firstAfter(words, /^number/i, endStartS) ?? endStartS), 'pop', 0.4),
    cue(at(comment), 'sparkle', 0.3),
  ];
};

type BuildInput = {
  preset: RealtorPreset;
  facts: RealtorFacts;
  plan: ShotPlan;
  script: ScriptPack;
  words: SpokenWord[];
  voiceDurationS: number;
  voicePath: string;
  assets: RealtorAssets;
};

export const buildVoicedProps = ({ preset, facts, plan, script, words, voiceDurationS, voicePath, assets }: BuildInput): VoicedProps => {
  const groups = script[preset].beats;
  const starts = sentenceStarts([...groups.flat(), ...script[preset].end], words);
  let s = 0;
  const beats: VoicedBeat[] = plan.beats.map((shot, i) => {
    const startS = i === 0 ? 0 : starts[s];
    s += groups[i]?.length ?? 0;
    const label = script.labels[i] ?? { kicker: '', title: '', rateItem: '' };
    const isRoom = shot.role === 'room';
    const rate = preset === 'rate';
    return {
      photo: shot.url,
      room: ROOM_TAG[shot.tag] ?? 'living',
      kicker: rate ? label.rateItem : label.kicker,
      title: rate ? '' : label.title,
      startS,
      checkAtS: rate && isRoom ? firstAfter(words, /^check/i, startS) : undefined,
    };
  });
  const endStartS = starts[s] ?? voiceDurationS - 3;
  return {
    facts: listingFacts(facts, script),
    beats,
    endStartS,
    endPhoto: plan.end.url,
    voice: voicePath,
    music: assets.music[preset],
    words,
    sfx: sfxFor(preset, beats, endStartS, words, assets),
    durationS: Math.max(MIN_DURATION_S, Math.ceil(voiceDurationS + VOICE_OFFSET_S + TAIL_S)),
  };
};
