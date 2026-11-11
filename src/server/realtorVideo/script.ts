// server-only — never import from a 'use client' file.
// One vision call writes the words for both voiced presets (Editorial, Rate this house) from the facts, the
// description and the planned photos. Flat top-level keys only (nested objects get dropped by small models).
// Every spoken sentence maps to exactly one beat, so cuts can land on sentence starts.

import { statusLabel } from '../../lib/listingPhotos';
import { chatJson } from '../ai/openai';
import type { PlannedShot, ShotPlan } from './shotPlan';

export type RealtorFacts = {
  city: string;
  state: string;
  priceUsd: number;
  beds: number;
  baths: number;
  sqft: number;
  status: string | null;
  description: string;
};

export type BeatWords = { kicker: string; title: string; rateItem: string };

export type ScriptPack = {
  hookTop: string;
  hookBottom: string;
  locationLine: string;
  /** Sentences per beat (index = beat index), then the end sentences. */
  editorial: { beats: string[][]; end: string[] };
  rate: { beats: string[][]; end: string[] };
  labels: BeatWords[];
};

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'D.C.',
};

export const stateName = (code: string) => STATE_NAMES[code.toUpperCase()] ?? code;
export const priceLabel = (usd: number) => `$${Math.round(usd).toLocaleString('en-US')}`;

/** Used when the model skips a beat. */
const FALLBACK: Record<PlannedShot['tag'], BeatWords & { sentence: string }> = {
  exterior: { kicker: 'WELCOME', title: 'Home', rateItem: 'Curb appeal', sentence: 'Curb appeal from the first look.' },
  porch: { kicker: 'FRONT', title: 'Porch', rateItem: 'Front porch', sentence: 'A front porch made for slow mornings.' },
  living: { kicker: 'BRIGHT', title: 'Living room', rateItem: 'Bright living room', sentence: 'The living room is bright and open.' },
  kitchen: { kicker: 'THE', title: 'Kitchen', rateItem: 'Great kitchen', sentence: 'The kitchen is ready to cook in.' },
  dining: { kicker: 'DINING', title: 'Room', rateItem: 'Dining room', sentence: 'A dining room for real dinners.' },
  feature: { kicker: 'BONUS', title: 'Room', rateItem: 'Bonus room', sentence: 'Plus a bonus room for anything.' },
  bedroom: { kicker: 'PRIMARY', title: 'Suite', rateItem: 'Primary suite', sentence: 'The primary bedroom is calm and roomy.' },
  bath: { kicker: 'FRESH', title: 'Bath', rateItem: 'Fresh bathroom', sentence: 'A clean, fresh bathroom.' },
  yard: { kicker: 'THE', title: 'Backyard', rateItem: 'Big backyard', sentence: 'And out back, room to breathe.' },
  aerial: { kicker: 'THE', title: 'Neighborhood', rateItem: 'Great location', sentence: 'A great spot in town.' },
  detail: { kicker: 'THE', title: 'Details', rateItem: 'Nice details', sentence: 'The details are done right.' },
  floorplan: { kicker: 'SMART', title: 'Layout', rateItem: 'Smart layout', sentence: 'A layout that just works.' },
};

type Raw = {
  location_line?: string;
  hook_line?: string;
  charm_sentence?: string;
  room_sentences?: string[];
  room_kickers?: string[];
  room_titles?: string[];
  rate_items?: string[];
};

const SYSTEM = `You write the voiceover and on-screen words for short vertical real estate videos (TikTok, Reels).
Plain spoken American English, 3rd-grade reading level, warm, no hype words (stunning, nestled, boasts, dream home), no emoji.
Only say what the photos or the description prove. Return JSON with exactly these keys:
"location_line": 2-6 words, the best nearby landmark or selling point from the description, e.g. "1 mile to The Battery". If none, the neighborhood or city.
"hook_line": 3-6 words, an italic strapline for the cover, e.g. "A mile from The Battery".
"charm_sentence": 6-9 words, spoken over the front of the home, e.g. "A charming ranch, one mile from The Battery."
"room_sentences": one sentence per room photo, in order, 4-7 words each. A real spoken sentence with a verb, like a friend
showing the home, naming the room and its best thing. Good: "The kitchen is fully updated." "Plus a brick wall room for movie nights."
"Upstairs, the primary suite has its own bath." Bad (listing-sheet fragments): "Kitchen with white cabinets and bar seating."
Never repeat the same room or idea twice. Start some with "Inside," "Plus," "Upstairs," "And out back," when true.
"room_kickers": one per room photo, 1-2 words in caps, e.g. "UPDATED".
"room_titles": one per room photo, 1-2 words, e.g. "Kitchen".
"rate_items": one per room photo, 2-5 words, a feature people would tick, e.g. "Updated kitchen". No question mark.`;

const userText = (facts: RealtorFacts, rooms: PlannedShot[]) =>
  [
    `${facts.beds} beds, ${facts.baths} baths, ${facts.sqft} sqft, ${priceLabel(facts.priceUsd)}, ${facts.city}, ${facts.state}.`,
    `Description: ${facts.description.slice(0, 1500)}`,
    `${rooms.length} room photos follow, in order. Their rough labels: ${rooms.map((r, i) => `${i + 1}=${r.tag}`).join(', ')}.`,
  ].join('\n');

const callModel = async (facts: RealtorFacts, rooms: PlannedShot[]): Promise<Raw> => {
  const result = await chatJson<Raw>(
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText(facts, rooms) },
          ...rooms.map((r) => ({ type: 'image_url' as const, image_url: { url: r.thumbUrl, detail: 'low' as const } })),
        ],
      },
    ],
    { maxTokens: 3000, temperature: 0.6, model: 'gpt-5.4-mini', reasoningEffort: 'low', timeoutMs: 60_000 },
  );
  return result ?? {};
};

const pick = (list: string[] | undefined, i: number, fallback: string, maxWords: number): string => {
  const v = list?.[i]?.trim();
  return v && v.split(/\s+/).length <= maxWords ? v : fallback;
};

const asSentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export const writeScripts = async (facts: RealtorFacts, plan: ShotPlan): Promise<ScriptPack> => {
  const rooms = plan.beats.filter((b) => b.role === 'room');
  const raw = await callModel(facts, rooms);
  const roomWords = rooms.map((r, i) => {
    const fb = FALLBACK[r.tag];
    return {
      kicker: pick(raw.room_kickers, i, fb.kicker, 2).toUpperCase(),
      title: pick(raw.room_titles, i, fb.title, 3),
      rateItem: pick(raw.rate_items, i, fb.rateItem, 5).replace(/[?.!]+$/, ''),
      sentence: asSentence(pick(raw.room_sentences, i, fb.sentence, 10)),
    };
  });
  const where = `${facts.city}, ${stateName(facts.state)}`;
  const price = priceLabel(facts.priceUsd);
  const opener = statusLabel(facts.status) ?? 'For sale';
  const locationLine = pick(raw.location_line ? [raw.location_line] : undefined, 0, facts.city, 7);
  const hasLocation = plan.beats.some((b) => b.role === 'location');
  const charm = asSentence(pick(raw.charm_sentence ? [raw.charm_sentence] : undefined, 0, `A great home in ${facts.city}.`, 11));
  const edLead = [[`${opener} in ${where}.`], ...(hasLocation ? [[charm]] : [])];
  const rateLead = [['Rate this house from one to ten.'], ...(hasLocation ? [[`It is ${price} in ${where}.`]] : [])];
  if (!hasLocation) rateLead[0].push(`It is ${price} in ${where}.`);
  return {
    hookTop: opener.toUpperCase(),
    hookBottom: pick(raw.hook_line ? [raw.hook_line] : undefined, 0, `in ${where}`, 7),
    locationLine: locationLine.toUpperCase(),
    editorial: { beats: [...edLead, ...roomWords.map((r) => [r.sentence])], end: [`Listed at ${price}.`, 'Comment tour for a private showing.'] },
    rate: { beats: [...rateLead, ...roomWords.map((r) => [`${r.rateItem}? Check.`])], end: ['So what is your number?', 'Drop it in the comments.', 'Comment tour for a private showing.'] },
    // One entry per beat (hook first), same order as plan.beats.
    labels: [
      { kicker: opener.toUpperCase(), title: facts.city, rateItem: '' },
      ...(hasLocation ? [{ kicker: locationLine.toUpperCase(), title: facts.city, rateItem: '' }] : []),
      ...roomWords.map(({ kicker, title, rateItem }) => ({ kicker, title, rateItem })),
    ],
  };
};
