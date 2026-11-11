/** Voiced test props for 2720 Carolyn Dr: beats cut on the sentence each room is named in. */
import editorialAudio from '../../../public/realtor-test/audio/editorial-words.json';
import rateAudio from '../../../public/realtor-test/audio/rate-words.json';
import { CAROLYN_TEST } from './testListing';
import { VOICED_DURATION_S, wordAt, type SfxCue, type SpokenWord, type VoicedBeat, type VoicedProps } from './voiced';

const dir = 'realtor-test/2720-carolyn';
const p = (n: number) => `${dir}/p${String(n).padStart(2, '0')}.jpg`;
const sfx = (name: string) => `realtor-test/sfx/${name}.mp3`;
const OFFSET = 0.2;

type BeatSpec = { photo: number; at: RegExp; after?: number; kicker: string; title: string; checks?: boolean };

const buildBeats = (words: SpokenWord[], specs: BeatSpec[]): VoicedBeat[] => {
  let from = 0;
  return specs.map((s, i) => {
    const startS = i === 0 ? 0 : wordAt(words, s.at, s.after ?? from);
    from = startS + 0.01;
    const checkAtS = s.checks ? wordAt(words, /^check/i, startS) : undefined;
    return { photo: p(s.photo), room: 'living', kicker: s.kicker, title: s.title, startS, checkAtS };
  });
};

const cueEach = (times: number[], file: string, volume: number): SfxCue[] => times.map((t) => ({ atS: t + OFFSET, file: sfx(file), volume }));

const edWords = editorialAudio.words as SpokenWord[];
const edBeats = buildBeats(edWords, [
  { photo: 1, at: /^Just/, kicker: 'JUST LISTED', title: 'Smyrna' },
  { photo: 0, at: /^A$/, kicker: 'ONE MILE TO', title: 'The Battery' },
  { photo: 2, at: /^Inside/, kicker: 'OPEN', title: 'Floor plan' },
  { photo: 5, at: /^The$/, kicker: 'UPDATED', title: 'Kitchen' },
  { photo: 9, at: /^Plus/, kicker: 'EXPOSED', title: 'Brick room' },
  { photo: 12, at: /^Three/, kicker: 'PRIMARY', title: 'Suite' },
  { photo: 11, at: /^with/, kicker: 'ENSUITE', title: 'Bath' },
  { photo: 16, at: /^And$/, kicker: 'FLAT WALKOUT', title: 'Backyard' },
]);
const edEnd = wordAt(edWords, /^Listed/);

export const EDITORIAL_VOICED: VoicedProps = {
  facts: CAROLYN_TEST.facts,
  beats: edBeats,
  endStartS: edEnd,
  endPhoto: p(18),
  voice: 'realtor-test/audio/editorial-voice.wav',
  music: 'realtor-test/audio/editorial-music.mp3',
  words: edWords,
  durationS: VOICED_DURATION_S,
  sfx: [
    ...cueEach(edBeats.slice(1).map((b) => b.startS - 0.25), 'whoosh-short', 0.12),
    { atS: edEnd + OFFSET - 0.3, file: sfx('whoosh-cinematic'), volume: 0.2 },
    { atS: edEnd + OFFSET + 1.2, file: sfx('sparkle'), volume: 0.25 },
    { atS: wordAt(edWords, /^Comment/) + OFFSET, file: sfx('chime'), volume: 0.2 },
  ],
};

const rateWords = rateAudio.words as SpokenWord[];
const rateBeats = buildBeats(rateWords, [
  { photo: 1, at: /^Rate/, kicker: 'rate', title: 'this house' },
  { photo: 0, at: /^It$/, kicker: 'smyrna', title: 'ga' },
  { photo: 3, at: /^Open/, kicker: 'open', title: 'floor plan', checks: true },
  { photo: 5, at: /^Updated/, kicker: 'updated', title: 'kitchen', checks: true },
  { photo: 9, at: /^Exposed/, kicker: 'exposed brick', title: 'room', checks: true },
  { photo: 12, at: /^Primary/, kicker: 'primary', title: 'suite', checks: true },
  { photo: 11, at: /^own/, kicker: 'ensuite', title: 'bath' },
  { photo: 16, at: /^Flat/, kicker: 'flat', title: 'backyard', checks: true },
]);
const rateEnd = wordAt(rateWords, /^So$/);
const rateChecks = rateWords.filter((w) => /^check/i.test(w.word)).map((w) => w.startS);

export const RATE_VOICED: VoicedProps = {
  facts: CAROLYN_TEST.facts,
  beats: rateBeats,
  endStartS: rateEnd,
  endPhoto: p(0),
  voice: 'realtor-test/audio/rate-voice.wav',
  music: 'realtor-test/audio/rate-music.mp3',
  words: rateWords,
  durationS: VOICED_DURATION_S,
  sfx: [
    ...cueEach(rateBeats.slice(1).map((b) => b.startS), 'click-soft', 0.25),
    ...cueEach(rateChecks, 'ping', 0.35),
    { atS: rateEnd + OFFSET, file: sfx('whoosh-short'), volume: 0.3 },
    { atS: wordAt(rateWords, /^number/) + OFFSET, file: sfx('pop'), volume: 0.4 },
    { atS: wordAt(rateWords, /^comment$/) + OFFSET, file: sfx('sparkle'), volume: 0.3 },
  ],
};
