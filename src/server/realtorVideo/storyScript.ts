// server-only — never import from a 'use client' file.
// One vision call writes the words of one template at one length (15 s, 25 s or the Auto story up to 60 s).
// The old writer (script.ts) still makes the standard 25 s Editorial and Rate videos; this one makes everything else.
// Flat top-level keys only (small models drop nested objects). One beat = one photo, so cuts land on sentence starts.

import { statusLabel } from '../../lib/listingPhotos';
import { chatJson } from '../ai/openai';
import { WORD_BUDGET, type RealtorPreset, type VideoLength } from './presets';
import { priceLabel, stateName, type RealtorFacts } from './script';
import type { PlannedShot, ShotPlan } from './shotPlan';

export type BeatLabel = { kicker: string; title: string; note?: string };

/** The words of one video: sentences per plan beat (hook first), the end sentences, and on-screen labels per beat. */
export type PresetScript = { hookText: string; beats: string[][]; end: string[]; labels: BeatLabel[]; highlights: string[] };

type Raw = {
  hook_text?: string;
  hook_sentence?: string;
  location_sentence?: string;
  beat_sentences?: string[];
  beat_titles?: string[];
  beat_kickers?: string[];
  beat_notes?: string[];
  highlights?: string[];
};

const VOICE_RULES = `Plain spoken American English, 3rd-grade reading level, warm, no hype words (stunning, nestled, boasts, dream home,
oasis, gem), no emoji, no hashtags. Only say what the photos, the facts or the description prove. Never invent schools, distances or views.`;

/** How each template talks. beat_* arrays have exactly one entry per room photo, in order. */
const STYLE: Record<RealtorPreset, string> = {
  editorial: `Editorial tour, calm. hook_text: 3-6 word italic strapline. beat_sentences: a friend showing the home, naming the room and its best thing
("The kitchen is fully updated."). beat_kickers: 1-2 words in caps ("UPDATED"). beat_titles: the room, 1-2 words ("Kitchen").`,
  rate: `"Rate this house 1 to 10". beat_sentences: exactly "<feature>? Check." with a 2-5 word feature people would tick ("Updated kitchen? Check.").
beat_kickers: the same feature, no question mark. beat_titles: "".`,
  pov: `"POV: you live here now", second person, present tense, like the viewer already moved in. hook_text: starts with "POV:", 4-8 words
("POV: you just got the keys in Smyrna"). hook_sentence: says the same idea out loud. beat_sentences: what YOU do in this room
("You make coffee at the long island."). beat_titles: the 1-2 words of the sentence to highlight ("long island").`,
  day: `"A day in this home", morning to night. hook_text: 4-7 words ("A day in this Smyrna home"). beat_kickers: a clock time for that moment,
going forward through one day from about 7:00 AM to 9:00 PM, format "7:30 AM". beat_titles: 2-4 word moment ("Coffee on the porch").
beat_sentences: that moment in that room, present tense ("At noon, lunch at the kitchen island.").`,
  top3: `"Things I love about this home", the agent talking. Each room entry is one reason (it may show two photos). beat_sentences start with
"Number one,", "Number two," and so on. beat_titles: the reason in 2-4 words ("Flat backyard"). beat_kickers: "".`,
  alert: `"New listing alert", the agent texting a friend, quick and excited but plain. hook_text: 3-6 words ("Just hit the market"). hook_sentence:
"Okay, this one just hit the market." style. beat_sentences: punchy, like a voice note. beat_notes: a handwritten 2-4 word note in lowercase with
"!" ("that island!"). beat_titles: the room in plain words, 1-2 words ("Kitchen", "Living room", "Primary bath").`,
  luxe: `Luxury showcase, slow and calm. hook_text: 3-6 words, the home's best quality ("Light, views and quiet"). beat_titles: ONE word
in caps, 4-7 letters, the quality the photo shows, NOT the room name ("LIGHT", "ISLAND", "CALM", "VIEWS", "SOAK"). beat_sentences: simple,
unhurried, sensory ("Morning light pours across the kitchen island.").`,
};

/** Story arc for the Auto length: the place and why it is special, not only the rooms. */
const AUTO_STORY = `This is the long version: tell the story of the home. Use the description and the facts (year built, lot, neighborhood,
what is special) to give each photo a reason to care: what life here feels like, what was updated, what makes it rare. You may use
two short sentences per photo (6-10 words each). The first room lines should set the scene, the last ones should build to why it is worth a tour.`;

const facts = (f: RealtorFacts): string =>
  [
    `${f.beds} beds, ${f.baths} baths, ${f.sqft} sqft, ${priceLabel(f.priceUsd)}, ${f.city}, ${f.state}.`,
    f.homeType ? `Type: ${f.homeType}.` : '',
    f.yearBuilt ? `Built in ${f.yearBuilt}.` : '',
    f.lotSqft ? `Lot: ${(f.lotSqft / 43_560).toFixed(2)} acres.` : '',
    f.neighborhood ? `Neighborhood: ${f.neighborhood}.` : '',
    f.highlights?.length ? `What's special (from Zillow): ${f.highlights.join('; ')}.` : '',
    `Description: ${f.description.slice(0, 2500)}`,
  ].filter(Boolean).join('\n');

const keysFor = (preset: RealtorPreset, location: boolean) => [
  '"hook_text": on-screen hook, see style.',
  '"hook_sentence": 5-10 words spoken over the front of the home.',
  location ? '"location_sentence": 6-10 words about where it is or the best nearby thing from the description.' : '',
  '"beat_sentences", "beat_titles", "beat_kickers": arrays, one entry per room photo.',
  preset === 'alert' ? '"beat_notes": array, one per room photo.' : '',
  '"highlights": 3-6 short things that make this home special (2-4 words each), from the description and facts.',
].filter(Boolean).join('\n');

const system = (preset: RealtorPreset, length: VideoLength, rooms: number, location: boolean) => {
  const [lo, hi] = WORD_BUDGET[length];
  return [
    'You write the voiceover and on-screen words for one vertical real estate video (TikTok, Reels, Facebook).',
    VOICE_RULES,
    `Style: ${STYLE[preset]}`,
    length === 'auto' ? AUTO_STORY : `One sentence per photo, ${length === 'short' ? '5-7' : '7-10'} words each.`,
    `All spoken sentences together (hook, location, rooms) must total ${lo - 10}-${hi - 10} words: count them. There are ${rooms} room photos.`,
    'Never repeat the same room or idea twice. Return JSON with exactly these keys:',
    keysFor(preset, location),
  ].join('\n');
};

const callModel = async (f: RealtorFacts, preset: RealtorPreset, length: VideoLength, plan: ShotPlan): Promise<Raw> => {
  const rooms = plan.beats.filter((b) => b.role === 'room');
  const location = plan.beats.some((b) => b.role === 'location');
  const labels = rooms.map((r, i) => `${i + 1}=${ROOM_WORDS[r.tag] ?? r.tag}${r.url2 ? ' (two photos)' : ''}`).join(', ');
  const result = await chatJson<Raw>(
    [
      { role: 'system', content: system(preset, length, rooms.length, location) },
      {
        role: 'user',
        content: [
          { type: 'text', text: `${facts(f)}\n${rooms.length} room photos follow, in order. Rough labels: ${labels}.` },
          ...rooms.map((r: PlannedShot) => ({ type: 'image_url' as const, image_url: { url: r.thumbUrl, detail: 'low' as const } })),
        ],
      },
    ],
    { maxTokens: 4000, temperature: 0.7, model: 'gpt-5.4-mini', reasoningEffort: 'low', timeoutMs: 90_000 },
  );
  return result ?? {};
};

/** Plain room names for the prompt (the model echoes them back as titles). */
const ROOM_WORDS: Record<string, string> = { feature: 'second living space', bath: 'bathroom', exterior: 'outside', aerial: 'view from above', detail: 'detail' };

const sentences = (s: string | undefined, fallback: string): string[] => {
  const text = (s ?? '').trim() || fallback;
  return text.split(/(?<=[.!?])\s+/).map((x) => (/[.!?]$/.test(x) ? x : `${x}.`));
};

const at = (list: string[] | undefined, i: number, fallback = '') => list?.[i]?.trim() || fallback;

/** End lines are fixed per template: the components key their animations off "number" and "Comment". */
const endLines = (preset: RealtorPreset, price: string): string[] => {
  const end: Record<RealtorPreset, string[]> = {
    editorial: [`Listed at ${price}.`, 'Comment tour for a private showing.'],
    rate: ['So what is your number?', 'Drop it in the comments.', 'Comment tour for a private showing.'],
    pov: [`All of this for ${price}.`, 'Comment tour and it could be yours.'],
    day: [`Offered at ${price}.`, 'Comment tour to spend a day here.'],
    top3: [`It is listed at ${price}.`, 'Which one is your favorite?', 'Comment tour for a private showing.'],
    alert: [`Listed at ${price}.`, 'Comment tour before it is gone.'],
    luxe: [`Offered at ${price}.`, 'Comment tour for a private showing.'],
  };
  return end[preset];
};

const hookLines = (preset: RealtorPreset, raw: Raw, f: RealtorFacts, reasons: number): string[] => {
  const where = `${f.city}, ${stateName(f.state)}`;
  if (preset === 'rate') return ['Rate this house from one to ten.', `It is ${priceLabel(f.priceUsd)} in ${where}.`];
  if (preset === 'top3') return [`${reasons} things I love about this ${f.city} home.`];
  const opener = statusLabel(f.status) ?? 'For sale';
  return sentences(raw.hook_sentence, `${opener} in ${where}.`);
};

const hookText = (preset: RealtorPreset, raw: Raw, f: RealtorFacts, reasons: number): string => {
  if (preset === 'rate') return 'Rate this house 1–10';
  if (preset === 'top3') return `${reasons} things I love`;
  return at([raw.hook_text ?? ''], 0, `New in ${f.city}`).replace(/[.]$/, '');
};

export const writePresetScript = async (f: RealtorFacts, preset: RealtorPreset, length: VideoLength, plan: ShotPlan): Promise<PresetScript> => {
  const raw = await callModel(f, preset, length, plan);
  const rooms = plan.beats.filter((b) => b.role === 'room');
  const location = plan.beats.some((b) => b.role === 'location');
  const head: string[][] = [hookLines(preset, raw, f, rooms.length)];
  const headLabels: BeatLabel[] = [{ kicker: (statusLabel(f.status) ?? 'For sale').toUpperCase(), title: f.city }];
  if (location) {
    head.push(sentences(raw.location_sentence, `It sits in ${f.city}.`));
    headLabels.push({ kicker: f.neighborhood?.toUpperCase() ?? f.city.toUpperCase(), title: f.city });
  }
  const roomBeats = rooms.map((r, i) => {
    const fallback = preset === 'rate' ? `Great ${r.tag}? Check.` : `Take a look at the ${r.tag}.`;
    const lines = sentences(raw.beat_sentences?.[i], fallback);
    if (preset === 'top3' && !/^number/i.test(lines[0])) lines[0] = `Number ${['one', 'two', 'three', 'four', 'five', 'six'][i] ?? i + 1}, ${lines[0]}`;
    return lines;
  });
  const roomLabels = rooms.map((r, i) => ({
    kicker: at(raw.beat_kickers, i, preset === 'rate' ? r.tag : ''),
    title: at(raw.beat_titles, i, ROOM_WORDS[r.tag] ?? r.tag),
    note: preset === 'alert' ? at(raw.beat_notes, i, 'love this!') : undefined,
  }));
  return {
    hookText: hookText(preset, raw, f, rooms.length),
    beats: [...head, ...roomBeats],
    end: endLines(preset, priceLabel(f.priceUsd)),
    labels: [...headLabels, ...roomLabels],
    highlights: (raw.highlights ?? []).filter((h) => typeof h === 'string').slice(0, 6),
  };
};

const MIN_ROOMS: Record<VideoLength, number> = { short: 2, standard: 3, auto: 5 };

const wordCount = (script: PresetScript) => [...script.beats.flat(), ...script.end].join(' ').split(/\s+/).filter(Boolean).length;

/**
 * Models overshoot word counts, so the length is enforced here: while the words run over the budget, the last room
 * beat (photo, sentences, label) is dropped. "3 things I love" keeps its count (the hook says it out loud).
 */
export const fitBudget = (plan: ShotPlan, script: PresetScript, preset: RealtorPreset, length: VideoLength): { plan: ShotPlan; script: PresetScript } => {
  const beats = [...plan.beats];
  const next: PresetScript = { ...script, beats: [...script.beats], labels: [...script.labels] };
  const rooms = () => beats.filter((b) => b.role === 'room').length;
  while (preset !== 'top3' && wordCount(next) > WORD_BUDGET[length][1] && rooms() > MIN_ROOMS[length]) {
    beats.pop();
    next.beats.pop();
    next.labels.pop();
  }
  return { plan: { ...plan, beats }, script: next };
};
