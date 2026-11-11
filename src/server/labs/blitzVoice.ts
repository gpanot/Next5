// server-only — never import from a 'use client' file.
// Blitz voiceover (2026-10-12, replaces music on Blitz cards): one spoken line per slide, written like a short explainer
// (the hook opens a loop, middle lines explain what the caption only states, the last line says the CTA), recorded with
// the Shorts voice step (Gemini 3.8 Flash TTS on treg; its two Whisper passes were cut 2026-10-14, one is back since 2026-10-17). Each slide then lasts as long as its
// line. Tested on 2026-10-12 (scripts/tmp/blitz-voice): the user rated it "much better" than music. ~$0.02 a video.
// Since 2026-10-13 each recording is cached by its text and voice: the Ideas deck previews it, the render reuses it.
// Since 2026-10-17 the caption IS the spoken line, each word shown as it is said (remotion/SpokenCaption.tsx): every
// line is heard back once by Whisper, which times its words and catches a take that added or skipped words (one test
// read "to a friend" from the director's notes, then said the line again); that line is recorded once more.

import { createHash } from 'crypto';
import { prisma } from '../../lib/db';
import { BLITZ_VOICES, DEFAULT_BLITZ_VOICE, isBlitzVoice, type BlitzVoiceOption } from '../../types/admin/blitzVoice';
import { createMeter } from '../metaAds/cost';
import { pcmSeconds, pcmToWav, SAMPLE_RATE, wavToPcm } from '../shorts/ffmpeg';
import { creativeJson } from '../shorts/llm';
import { sampleLine, synthesize } from '../shorts/voice';
import { alignWords, misreadWords, transcribe, WHISPER_USD_PER_MIN } from '../shorts/wordTiming';
import type { SpokenWord } from '../../remotion/types';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { getObject, putObject } from '../storage/objectStore';
import { loadWebsiteSource } from './websiteDeck';
import { workspaceRunId } from './workspaceRun';

/**
 * Lines recorded at once. 3 after a 503 "pool is saturated" on 7 (2026-10-13), but that cost 3 rounds of ~5 s each.
 * 7 at once passed on 2026-10-14 (5.5 s wall), and withRetry backs off on a 503, so every line goes at once again.
 */
const RECORD_AT_ONCE = 10;

/** `fn` over `items`, at most `limit` running at a time, results in order. */
const mapLimited = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

/** Breath after each slide's line before the next slide's line starts. */
const SLIDE_GAP_S = 0.35;
const MIN_SLIDE_S = 1.6;
/** The render keeps slides between 1 and 10 s (blitzRender.ts cleanSlide). */
const MAX_SLIDE_S = 10;
/** One delivery for every Blitz narrator: the explainer tone the user liked in the test. */
const DIRECTION = 'A friendly expert explaining something useful to a friend: warm, clear and grounded, natural conversational pace with room to breathe, never salesy.';
const SAMPLE_TEXT = "Here's a quick tip that can save you hours this week.";
const sampleKey = (voice: string) => `blitz/voices/samples/${voice}-v1.wav`;

const SYSTEM = `You write the voiceover of a short vertical video (TikTok / Reels). The video is a series of slides, each
with a short caption on screen. A narrator explains the story out loud, like a friendly explainer video, so the viewer
keeps watching. Write ONE spoken line per slide, in order.
Rules:
- Line 1 is the hook in its own words, so it lands in the first 2 seconds. Keep its wording; at most add a few words
  that make it flow when spoken. Only sometimes add a short loop, and make it specific to this video, never a stock
  phrase ("most people miss it", "most people get this wrong", "here's why", "here's the fix", "and it matters" are
  banned). Max 14 words.
- Middle lines EXPLAIN, never read the caption back: the viewer already sees it. Each adds one thing the screen does
  not say: the why, a quick picture of the moment, what it costs, or how it works. 10-18 words each.
- Each line hands off to the next slide so the story pulls forward ("And that's the problem.", "Here's the fix.").
- Plain 3rd-grade words, contractions, one idea per line, talk to "you", like a friend explaining over coffee.
- Last line says the call to action of the last slide in its own words, warm and short (max 8 words). Name the
  business only when the slide does, as BRAND writes it; never add it, never say a web address (.com, .au, www). Only this line may name the
  brand or its product: the other lines teach, never sell (value content for TikTok and Instagram, not an ad).
- Every fact, number and result stays exactly as on screen, with the same subject: never soften it ("some", "up to"),
  never widen it. Never invent results, prices, features or claims.
- No emojis, no hashtags, no stage directions, no brackets.
Return JSON with flat keys: {"line_1": string, "line_2": string, ...} one key per slide.`;

export type NarratedSlide = { text: string; durationSec?: number };

/** A narrated slide: its text is the spoken line, `words` times each word from the slide's start. */
export type Narration<S> = {
  slides: Array<S & { durationSec: number; words: SpokenWord[] }>;
  audioKey: string;
  durationSeconds: number;
  voice: string;
  lines: string[];
};

/** A voiceover is kept by what it says and how: the deck preview and the later render of the same card share one recording. */
const cacheBase = (voice: string, workspaceId: string | null, texts: string[]): string => {
  // 'spoken-v1': recordings made before word timings (2026-10-17) are not reused.
  const hash = createHash('sha256').update(JSON.stringify(['spoken-v1', SYSTEM, DIRECTION, voice, workspaceId, texts.map((t) => t.trim())])).digest('hex').slice(0, 32);
  return `blitz/voiceovers/cache/${hash}`;
};

/** `misread` (debug, 2026-10-20): per line, the words the kept take added (+) or skipped (-), e.g. read director's notes. */
export type CachedNarration = { audioKey: string; durations: number[]; lines: string[]; voice: string; words: SpokenWord[][]; misread?: string[][] };

/** The recorded voiceover of these slides in this voice, if one was made before (a preview or a render). */
export async function cachedNarration(slideTexts: string[], voiceName: string | undefined, workspaceId: string | null): Promise<CachedNarration | null> {
  const voice = isBlitzVoice(voiceName) ? voiceName : DEFAULT_BLITZ_VOICE;
  const raw = await getObject(`${cacheBase(voice, workspaceId, slideTexts)}.json`).catch(() => null);
  if (!raw) return null;
  try {
    const hit = JSON.parse(raw.toString('utf8')) as CachedNarration;
    return hit.durations?.length === slideTexts.length && hit.words?.length === slideTexts.length ? hit : null;
  } catch {
    return null;
  }
}

/**
 * The recording also kept under its spoken lines: an Ideas card whose captions became those lines (2026-10-17) finds the
 * same recording at render time instead of writing new lines from them.
 */
export async function keepUnderSpokenLines(narration: CachedNarration, workspaceId: string | null): Promise<void> {
  const key = `${cacheBase(narration.voice, workspaceId, narration.lines)}.json`;
  await Promise.all([
    putObject(key, Buffer.from(JSON.stringify(narration)), 'application/json'),
    putObject(linesKey(workspaceId, narration.lines), Buffer.from(JSON.stringify(narration.lines)), 'application/json'),
  ]);
}

const silence = (seconds: number): Buffer => Buffer.alloc(Math.max(0, Math.round(seconds * SAMPLE_RATE)) * 2);

/** "avenue2.au" → "avenue2": workspaces are often named after their site. */
const withoutDomain = (name: string) => name.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').replace(/\.[a-z]{2,}(?:\.[a-z]{2,})?\/?$/i, '');

/** What the brand is, for the voiceover writer: the profile's business name ("EQL Apparel"), never the site's address. */
const brandOf = async (workspaceId: string | null): Promise<{ name: string; about: string }> => {
  const ws = workspaceId ? await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, promoting: true, offer: true } }) : null;
  const profileName = workspaceId
    ? await workspaceRunId(workspaceId).then(loadWebsiteSource).then((s) => s.profile.identity.businessName.value).catch(() => null)
    : null;
  return { name: profileName || (ws?.name ? withoutDomain(ws.name) : 'the brand'), about: ws?.promoting ?? ws?.offer ?? '' };
};

/** One spoken line per slide (a slide's caption when the writer skipped it). */
const writeLines = async (slides: NarratedSlide[], workspaceId: string | null, meter: ReturnType<typeof createMeter>): Promise<string[]> => {
  const brand = await brandOf(workspaceId);
  const user = `BRAND: ${brand.name}\nWHAT IT IS: ${brand.about}\nSLIDES:\n${slides.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}`;
  const raw = await creativeJson<Record<string, string | undefined>>(SYSTEM, user, meter, 'Blitz voiceover');
  return slides.map((s, i) => raw[`line_${i + 1}`]?.replace(/\s+/g, ' ').trim() || s.text);
};

/** Spoken lines kept by the captions they were written from; lines are kept under themselves too (read as they are). */
const linesKey = (workspaceId: string | null, texts: string[]): string => {
  const hash = createHash('sha256').update(JSON.stringify(['lines-v1', SYSTEM, workspaceId, texts.map((t) => t.trim())])).digest('hex').slice(0, 32);
  return `blitz/voiceovers/lines/${hash}.json`;
};

const keepLines = async (texts: string[], lines: string[], workspaceId: string | null): Promise<void> => {
  const body = Buffer.from(JSON.stringify(lines));
  await Promise.all([putObject(linesKey(workspaceId, texts), body, 'application/json'), putObject(linesKey(workspaceId, lines), body, 'application/json')]);
};

const keptLines = async (texts: string[], workspaceId: string | null): Promise<string[] | null> => {
  const raw = await getObject(linesKey(workspaceId, texts)).catch(() => null);
  if (!raw) return null;
  try {
    const lines = JSON.parse(raw.toString('utf8')) as unknown;
    return Array.isArray(lines) && lines.length === texts.length && lines.every((l) => typeof l === 'string') ? lines as string[] : null;
  } catch {
    return null;
  }
};

const writing = new Map<string, Promise<string[]>>();

/**
 * The spoken lines of these captions, written once (2026-10-19): a new batch's cards take them as captions while they
 * finish (ideaFinish.ts), and the deck's recording of the same captions reads the same lines, never a second take of
 * the writer. Captions that are spoken lines already come back as they are, so the other voice says the same words.
 */
export async function spokenLines(texts: string[], workspaceId: string | null, meter = createMeter()): Promise<string[]> {
  const key = linesKey(workspaceId, texts);
  const running = writing.get(key);
  if (running) return running;
  const job = (async () => {
    const kept = await keptLines(texts, workspaceId);
    if (kept) return kept;
    const lines = await writeLines(texts.map((text) => ({ text })), workspaceId, meter);
    await keepLines(texts, lines, workspaceId);
    return lines;
  })().finally(() => writing.delete(key));
  writing.set(key, job);
  return job;
}

type Take = { wav: Buffer; words: SpokenWord[]; errors: string[] };

/**
 * One take of a line, heard back: its word timings (syllable spread when Whisper fails) and the words it got wrong.
 * `direction` false: the plain line, without the director's notes (the voice cannot read them aloud).
 */
const takeLine = async (line: string, voice: string, meter: ReturnType<typeof createMeter>, direction = true): Promise<Take> => {
  const take = await synthesize(line, { voice, direction: direction ? DIRECTION : undefined }, meter, { readBack: false, wordTimings: false });
  const heard = await transcribe(take.wav, line).catch((err: unknown) => {
    console.warn('[blitz/voice] Whisper failed, syllable timing:', err instanceof Error ? err.message.slice(0, 160) : err);
    return null;
  });
  if (!heard) return { wav: take.wav, words: take.words, errors: [] };
  meter.add('Word timing (Whisper)', Math.round((take.durationS / 60) * WHISPER_USD_PER_MIN * 1_000_000));
  const { extra, missing } = misreadWords(line, heard);
  const words = alignWords(line.split(/\s+/).filter(Boolean), heard, take.durationS) ?? take.words;
  return { wav: take.wav, words, errors: [...extra.map((w) => `+${w}`), ...missing.map((w) => `-${w}`)] };
};

/**
 * A line recorded; recorded once more when the voice added or skipped words (the take with fewer errors wins). The
 * second take goes without the director's notes (2026-10-20): a voice that read them aloud once could do it again.
 */
const recordLine = async (line: string, voice: string, meter: ReturnType<typeof createMeter>): Promise<Take> => {
  const first = await takeLine(line, voice, meter);
  if (!first.errors.length) return first;
  console.warn(`[blitz/voice] line misread (${first.errors.join(' ')}); recording it again`);
  const second = await takeLine(line, voice, meter, false);
  const kept = second.errors.length < first.errors.length ? second : first;
  if (kept.errors.length) console.warn(`[blitz/voice] line still misread after 2 takes (${kept.errors.join(' ')}): "${line}"`);
  return kept;
};

const roundWords = (words: SpokenWord[], maxS: number): SpokenWord[] =>
  words.map((w) => ({ word: w.word, startS: Math.round(Math.min(maxS, w.startS) * 1000) / 1000, endS: Math.round(Math.min(maxS, w.endS) * 1000) / 1000 }));

/**
 * The voiceover of a Blitz slideshow: lines written, each recorded in `voice`, one WAV saved to storage. Slides come
 * back timed to their line (the render's per-slide durations), their text replaced by the line, with its word timings.
 * Throws when a line cannot be recorded.
 */
/** Debug (2026-10-20, live-only voice_busy): names the step a narration failed at, keeping the cause. */
const atStep = <T>(step: string, work: Promise<T>): Promise<T> =>
  work.catch((err: unknown) => {
    throw new Error(`${step}: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  });

export async function narrateSlides<S extends NarratedSlide>(slides: S[], voiceName: string | undefined, workspaceId: string | null): Promise<Narration<S>> {
  const voice = isBlitzVoice(voiceName) ? voiceName : DEFAULT_BLITZ_VOICE;
  const texts = slides.map((s) => s.text);
  const hit = await cachedNarration(texts, voice, workspaceId);
  if (hit) {
    const timed = slides.map((slide, i) => ({ ...slide, text: hit.lines[i]!, durationSec: hit.durations[i]!, words: hit.words[i]! }));
    const durationSeconds = Math.round(hit.durations.reduce((sum, d) => sum + d, 0) * 100) / 100;
    return { slides: timed, audioKey: hit.audioKey, durationSeconds, voice, lines: hit.lines };
  }
  const started = Date.now();
  const meter = createMeter();
  const lines = await atStep('writing lines', spokenLines(texts, workspaceId, meter));
  const takes = await atStep('recording', mapLimited(lines, RECORD_AT_ONCE, (line) => recordLine(line, voice, meter)));
  const pcms: Buffer[] = [];
  const timed = slides.map((slide, i) => {
    const pcm = wavToPcm(takes[i]!.wav);
    const seconds = Math.min(MAX_SLIDE_S, Math.max(MIN_SLIDE_S, pcmSeconds(pcm) + SLIDE_GAP_S));
    // A line longer than the slide's cap is cut there rather than drifting over the next slide.
    const fitted = pcm.subarray(0, Math.round(seconds * SAMPLE_RATE) * 2);
    pcms.push(Buffer.concat([fitted, silence(seconds - pcmSeconds(fitted))]));
    return { ...slide, text: lines[i]!, durationSec: Math.round(seconds * 100) / 100, words: roundWords(takes[i]!.words, seconds) };
  });
  const base = cacheBase(voice, workspaceId, texts);
  const audioKey = `${base}.wav`;
  await atStep('saving audio', putObject(audioKey, pcmToWav(Buffer.concat(pcms)), 'audio/wav'));
  const manifest: CachedNarration = { audioKey, durations: timed.map((s) => s.durationSec), lines, voice, words: timed.map((s) => s.words), misread: takes.map((t) => t.errors) };
  await putObject(`${base}.json`, Buffer.from(JSON.stringify(manifest)), 'application/json');
  await keepUnderSpokenLines(manifest, workspaceId);
  const durationSeconds = Math.round(timed.reduce((sum, s) => sum + s.durationSec, 0) * 100) / 100;
  const cost = meter.summary();
  console.log(`[blitz/voice] ${voice}, ${slides.length} lines, ${durationSeconds.toFixed(1)} s in ${((Date.now() - started) / 1000).toFixed(1)} s, $${(cost.usdMicros / 1e6).toFixed(4)}`);
  return { slides: timed, audioKey, durationSeconds, voice, lines };
}

/** The voice options with their sample line, each recorded once and kept in storage. A failed sample has no URL. */
export async function blitzVoiceOptions(): Promise<BlitzVoiceOption[]> {
  return Promise.all(
    BLITZ_VOICES.map(async (o) => {
      const key = sampleKey(o.name);
      try {
        if (!(await getObject(key))) await putObject(key, await sampleLine(SAMPLE_TEXT, { voice: o.name, direction: DIRECTION }, createMeter()), 'audio/wav');
        return { ...o, sampleUrl: await blitzBrowserUrl(key) };
      } catch (err) {
        console.warn(`[blitz/voice] sample of ${o.name} failed:`, err instanceof Error ? err.message.slice(0, 160) : err);
        return { ...o, sampleUrl: null };
      }
    }),
  );
}
