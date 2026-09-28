// server-only — never import from a 'use client' file.
// Video step 1: a short spoken script in Alex Hormozi's short-form structure (hook in 2 s, one idea, one proof, CTA),
// built on the ad's play and its winning pick. The model writes; the code enforces the word budget, the claims, the
// timing, and assembles the Wan prompt itself.

import { CRITERION_LABELS, type BrandLever, type BrandProfile, type CompetitorAd, type MetaAdRunDto, type VideoBeat, type VideoScript } from '../../../types/admin/metaAds';
import { unsupportedNumbers } from '../claims';
import type { CostMeter } from '../cost';
import { metaAdsJson } from '../llm';
import { clip } from '../text';

/** Natural UGC speech is about 2.3 words per second; more gets rushed or cut off by the model. */
const WORDS_PER_SECOND = 2.3;

export const wordBudget = (duration: number) => Math.floor(duration * WORDS_PER_SECOND);

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

type AdForVideo = { headline: string; primaryText: string; overlayText: string; play: string; inspiredByAdId: string | null };

const SYSTEM = `You write a vertical UGC video ad script, the way Alex Hormozi teaches short-form ads:
- 0-2 s HOOK: call out the buyer or their pain, or make one bold specific claim. No "hey guys", no greeting.
- Middle: ONE idea. Show the outcome and why it is likely to work (one proof point from the facts).
- Last 2 s: clear CTA ("Tap Learn more…").
The speaker is a real-looking peer of the buyer, filmed on their own phone. They may talk about the problem in first person,
but never claim results from the product and never pretend to be a customer ("it grew my business" is forbidden).
Only facts from BRAND FACTS. No invented numbers, prices, reviews or guarantees. Plain words.
"say" is read aloud by a voice model, so write it exactly as a person says it: no unit abbreviations.
Write "1 hour", "24 hours", "30 minutes", "10 seconds", "2 days", "3 weeks" — never "1h", "24h", "30min", "10s", "2d", "3wk".
Timing: beats cover 0 to DURATION seconds with no gaps. Spoken words in total: at most WORD_BUDGET.
"action": what the person does on camera in that beat (expression, gesture with the free hand). One hand holds the phone that films them,
so they never hold or show a second phone. No on-screen text.
Return JSON: {"persona": {"gender", "age": number, "ethnicity", "look": outfit in one plain sentence, no logos, "setting": the place only, as a noun phrase, e.g. "a small garage workshop"},
"beats": [{"from": number, "to": number, "say": string, "action": string}], "why": one or two sentences tying the script to the winning ad and play}`;

const describeLever = (l: BrandLever) => `[${CRITERION_LABELS[l.criterion]}] ${l.claim} (site: "${l.quote}")`;

const userPrompt = (profile: BrandProfile, run: MetaAdRunDto, ad: AdForVideo, source: CompetitorAd | undefined, duration: number) => {
  const play = run.hormozi?.plays.find((p) => p.name === ad.play);
  const pick = run.hormozi?.picks.find((p) => p.adId === ad.inspiredByAdId);
  return `DURATION: ${duration} seconds. WORD_BUDGET: ${wordBudget(duration)} spoken words.
BRAND: ${profile.brandName} (${profile.domain}) — ${profile.valueProp}
BUYER: ${profile.audience}
THE STATIC AD THIS VIDEO EXTENDS: hook "${ad.overlayText}" · headline "${ad.headline}" · text "${ad.primaryText}"
PLAY: ${play ? `${play.name}: ${play.structure}` : ad.play}
WINNING AD IT COMES FROM: ${source ? `${source.pageName} — ${clip(source.body, 400)}` : 'n/a'}${pick?.why ? `\nWHY THAT AD WINS: ${pick.why}` : ''}${pick?.fix ? `\nHORMOZI'S FIX: ${pick.fix}` : ''}
COMPETITOR PATTERNS: ${run.competitors?.patterns.join(' | ') ?? 'n/a'}
BRAND FACTS (the only claims allowed):
${(run.hormozi?.levers ?? []).map(describeLever).join('\n')}`;
};

type RawScript = {
  persona?: Partial<Record<'gender' | 'ethnicity' | 'look' | 'setting', unknown>> & { age?: unknown };
  beats?: { from?: unknown; to?: unknown; say?: unknown; action?: unknown }[];
  why?: unknown;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const SPOKEN_UNITS: [RegExp, string][] = [
  [/^(h|hr|hrs)$/i, 'hour'],
  [/^(min|mins)$/i, 'minute'],
  [/^(sec|secs)$/i, 'second'],
  [/^d$/i, 'day'],
  [/^(wk|wks)$/i, 'week'],
];

/**
 * The voice model reads text literally ("24h" is said "twenty-four h"), so abbreviated durations become words:
 * "24h" → "24 hours", "1 hr" → "1 hour", "30min" → "30 minutes". A bare "s" is left alone ("the 90s"). Pure, unit-tested.
 */
export const spokenDurations = (text: string): string =>
  text.replace(/\b(\d+(?:[.,]\d+)?)\s?(h|hrs?|mins?|secs?|d|wks?)\b(?!['’]|\/)/gi, (match, n: string, unit: string) => {
    const word = SPOKEN_UNITS.find(([re]) => re.test(unit))?.[1];
    return word ? `${n} ${word}${n === '1' ? '' : 's'}` : match;
  });

/**
 * Makes the beats usable: spells out abbreviated durations, drops empty ones, re-times them back to back from 0 to the duration (spread by words), then
 * removes middle beats with unprovable numbers or over the word budget. The hook and CTA are never cut: if they break
 * a rule, the script is rejected. Pure, unit-tested.
 */
export const enforceBeats = (raw: RawScript['beats'], duration: number, facts: string): { beats: VideoBeat[]; problem: string | null } => {
  let beats = (raw ?? []).map((b) => ({ say: spokenDurations(str(b.say)), action: str(b.action) })).filter((b) => b.say);
  if (beats.length < 2) return { beats: [], problem: 'needs at least a hook and a CTA' };
  const edge = (i: number) => i === 0 || i === beats.length - 1;
  if (beats.some((b, i) => edge(i) && unsupportedNumbers(b.say, facts).length)) return { beats: [], problem: 'hook or CTA has a number the brand cannot prove' };
  beats = beats.filter((b, i) => edge(i) || unsupportedNumbers(b.say, facts).length === 0);
  const budget = wordBudget(duration);
  while (beats.reduce((n, b) => n + words(b.say), 0) > budget && beats.length > 2) {
    const middle = beats.slice(1, -1);
    const longest = middle.reduce((a, b) => (words(b.say) > words(a.say) ? b : a), middle[0]);
    beats = beats.filter((b) => b !== longest);
  }
  if (beats.reduce((n, b) => n + words(b.say), 0) > budget) return { beats: [], problem: `hook and CTA alone exceed ${budget} words` };
  const total = beats.reduce((n, b) => n + Math.max(1, words(b.say)), 0);
  let at = 0;
  const timed = beats.map((b, i) => {
    const to = i === beats.length - 1 ? duration : Math.max(at + 1, Math.round(at + (Math.max(1, words(b.say)) / total) * duration));
    const beat = { from: at, to: Math.min(to, duration), say: b.say, action: b.action };
    at = beat.to;
    return beat;
  });
  return { beats: timed, problem: null };
};

/** One sentence ending in exactly one period. */
const sentence = (text: string) => `${text.trim().replace(/[.!?\s]+$/, '')}.`;

/** "filmed on a smartphone in her workshop office" → "her workshop office": the prompt already says it is a phone video. */
export const placeOnly = (setting: string) => setting.replace(/^(filmed|shot|recorded)\b[^,]*?\bin\s+/i, '').trim();

/** The Wan 3.0 prompt, assembled by code from the checked script (the model never writes it free-form). */
export const composeVideoPrompt = (script: VideoScript): string =>
  [
    `Vertical 9:16 UGC video, filmed on a phone held by the speaker at arm's length: selfie framing, slight natural hand shake.`,
    `The person from the reference image, ${script.persona.look.replace(/[.\s]+$/, '')}, in ${placeOnly(script.persona.setting)}, natural available light.`,
    'They talk straight to the camera in a casual, confident, everyday voice.',
    'One hand holds the phone that films; gestures use the other hand.',
    ...script.beats.map((b) => `[${b.from}-${b.to}s] ${sentence(b.action || 'Talks to camera')} Says: "${b.say}"`),
    'Realistic skin and motion, natural pauses, small hand gestures. Spoken voice only, no music.',
    'No on-screen text, captions, subtitles, logos or watermarks.',
  ].join('\n');

const toScript = (raw: RawScript, beats: VideoBeat[], duration: number): VideoScript | null => {
  const p = raw.persona ?? {};
  const persona = { gender: str(p.gender), age: Math.round(Number(p.age) || 0), ethnicity: str(p.ethnicity), look: str(p.look), setting: str(p.setting) };
  if (!persona.gender || !persona.age || !persona.look || !persona.setting) return null;
  return { persona, beats, wordCount: beats.reduce((n, b) => n + words(b.say), 0), wordBudget: wordBudget(duration), why: str(raw.why) };
};

/** Writes the script, with one retry when it breaks a rule the code cannot repair. */
export const writeVideoScript = async (
  profile: BrandProfile,
  run: MetaAdRunDto,
  ad: AdForVideo,
  duration: number,
  meter: CostMeter,
): Promise<VideoScript> => {
  const source = [...(run.competitors?.ads ?? []), ...(run.competitors?.ownAds ?? [])].find((c) => c.id === ad.inspiredByAdId);
  const facts = [...(run.hormozi?.levers ?? []).flatMap((l) => [l.claim, l.quote]), profile.pageExcerpt].join('\n');
  let problem = 'no answer';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await metaAdsJson<RawScript>(
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${userPrompt(profile, run, ad, source, duration)}${attempt > 1 ? `\n\nYOUR LAST SCRIPT WAS REJECTED: ${problem}. Fix that.` : ''}` },
      ],
      { maxTokens: 6_000, reasoningEffort: 'medium', meter, label: 'OpenAI video script' },
    );
    const checked = enforceBeats(raw.beats, duration, facts);
    const script = checked.problem ? null : toScript(raw, checked.beats, duration);
    if (script) return script;
    problem = checked.problem ?? 'persona is missing gender, age, look or setting';
  }
  throw new Error(`Video script rejected twice: ${problem}`);
};
