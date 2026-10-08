// server-only — never import from a 'use client' file.
// Shorts pipeline: 1 script (+ fact check) → 2 voice ∥ 3 shots + photos → 4 video clips → 5 render.
// Photos need only the script, so since 2026-10-08 steps 2 and 3 run side by side (saving ~30 s), on an estimated timing;
// once both are done the photos are re-timed onto the real voice. A re-run from 3 alone runs after the existing voice.
// A voice swap runs only 2 and 5: the new narration is re-timed onto the existing photos and clips.
// Each step saves its checkpoint, time and cost on the short. On Vercel (300 s per function) voice + photos, clips and
// render each start in a fresh invocation via the continue route; locally the pipeline just keeps going.

import { Prisma, type ShortReel } from '@prisma/client';
import { signAdminToken } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import type { ShortAudio, ShortBeat, ShortInputs, ShortScript, ShortScriptAttempt, ShortStep, ShortVideoModel } from '../../types/admin/shorts';
import type { StepCost } from '../../types/admin/metaAds';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { clip as clipText } from '../metaAds/text';
import { appBaseUrl } from '../social/links';
import { getObject as getStoredObject, putObject } from '../storage/objectStore';
import { genSeconds, planBeats } from './beats';
import { buildShortInputs } from './brand';
import { factCheck, factFeedback } from './factCheck';
import { downloadUrl } from './download';
import { makeClip, makePhoto, type ClipSource } from './media';
import { fitHook } from './hookFit';
import { previewFrame, renderShort, type RenderBeat } from './render';
import { writeScript } from './script';
import { rateScript } from './scriptJev';
import { photoPrompt, planVisuals, videoPrompt } from './visuals';
import { stripTags, synthesize } from './voice';
import { withRetry } from './treg';
import { pickVoice, planVoices, sampleVoices } from './voices';

const MAX_DRAFTS = 3;
const json = (v: unknown) => v as Prisma.InputJsonValue;
const load = (id: string) => prisma.shortReel.findUniqueOrThrow({ where: { id } });
const keyFor = (id: string, name: string) => `shorts/${id}/${name}`;
/**
 * A stored file, downloaded again when the transfer breaks: the render pulls the voice, every photo and every clip at
 * once, and one R2 download cut mid-body failed a render with "aborted" (2026-10-08). 4 tries over ~24 s.
 */
const getObject = (key: string) => withRetry(() => getStoredObject(key), 4);

type StepFn = (short: ShortReel, meter: CostMeter) => Promise<Prisma.ShortReelUpdateInput>;

const lastScript = (short: ShortReel) => {
  const attempts = short.attempts as unknown as ShortScriptAttempt[];
  const last = attempts[attempts.length - 1];
  if (!last) throw new Error('No script yet: resume from step 1');
  return last.script;
};

const scriptStep: StepFn = async (short, meter) => {
  const inputs = await buildShortInputs(short.workspaceId);
  const attempts: ShortScriptAttempt[] = [];
  let feedback: string | null = null;
  for (let i = 0; i < MAX_DRAFTS; i++) {
    const script = await writeScript(inputs, meter, feedback);
    const [claims, jev] = await Promise.all([factCheck(script, inputs, meter), rateScript(script, inputs)]);
    attempts.push({ script, claims, jev });
    feedback = factFeedback(claims);
    if (!feedback) break;
  }
  // A new script gets a new voice cast (the samples read the old hook).
  return { inputs: json(inputs), attempts: json(attempts), audio: Prisma.DbNull };
};

/** The voice options: kept from an earlier run (a swap or a re-run), else cast, sampled and picked by Jev. */
const voiceCast = async (short: ShortReel, meter: CostMeter): Promise<Pick<ShortAudio, 'voice' | 'direction' | 'options' | 'pickedBy'>> => {
  const earlier = short.audio as unknown as ShortAudio | null;
  if (earlier?.options?.length && earlier.direction) return earlier;
  const inputs = short.inputs as unknown as ShortInputs;
  const script = lastScript(short);
  const { direction, options } = await planVoices(inputs, script, meter);
  const save = async (name: string, wav: Buffer) => {
    const key = keyFor(short.id, `voice-sample-${name}.wav`);
    await putObject(key, wav, 'audio/wav');
    return key;
  };
  const [sampled, picked] = await Promise.all([sampleVoices(options, script.hook, direction, meter, save), pickVoice(options, inputs, script, direction)]);
  const merged = picked.options.map((o) => ({ ...o, sampleKey: sampled.find((s) => s.name === o.name)?.sampleKey }));
  return { voice: picked.voice, direction, options: merged, pickedBy: picked.pickedBy };
};

/** Existing beats moved onto the new narration's timing; photos, prompts and clips are kept. */
const retimed = (short: ShortReel, audio: ShortAudio): ShortBeat[] | null => {
  const beats = short.beats as unknown as ShortBeat[] | null;
  if (!beats?.length) return null;
  const timing = planBeats(lastScript(short), audio.words, audio.durationS);
  return beats.map((b) => ({ ...b, startS: timing[b.idx]?.startS ?? b.startS, spanS: timing[b.idx]?.spanS ?? b.spanS }));
};

/** The voice. `retime`: move existing photos onto it (a voice swap); off when the photos are being made alongside. */
const makeVoiceStep = (retime: boolean): StepFn => async (short, meter) => {
  const cast = await voiceCast(short, meter);
  const { wav, durationS, words, sentences, tempo, rawWpm } = await synthesize(lastScript(short).narration, { voice: cast.voice, direction: cast.direction }, meter);
  const key = keyFor(short.id, 'voice.wav');
  await putObject(key, wav, 'audio/wav');
  const audio: ShortAudio = { ...cast, key, durationS, words, sentences, tempo, rawWpm };
  const beats = retime ? retimed(short, audio) : null;
  return { audio: json(audio), ...(beats ? { beats: json(beats) } : {}) };
};

/** On-screen text (no word captions since 2026-10-08): the hook on the first scene, the call to action on the last. */
const onScreenText = (beat: ShortBeat, script: ShortScript, count: number): string | null => {
  if (beat.idx === 0) return script.hook.replace(/\.$/, '');
  return beat.idx === count - 1 ? script.cta ?? null : null;
};

/** Speaking pace used to time the shots while the voice is still recording (the real voice lands ~160-170 wpm). */
const ESTIMATE_WPM = 165;

/** The beats on the voice's timing, or on an estimate when the voice is not recorded yet (re-timed afterwards). */
const beatTiming = (short: ShortReel): ShortBeat[] => {
  const audio = short.audio as unknown as ShortAudio | null;
  const script = lastScript(short);
  if (audio?.words?.length) return planBeats(script, audio.words, audio.durationS);
  const words = stripTags(script.narration).split(' ').filter(Boolean).length;
  return planBeats(script, [], (words / ESTIMATE_WPM) * 60);
};

const photoStep: StepFn = async (short, meter) => {
  const inputs = short.inputs as unknown as ShortInputs;
  const script = lastScript(short);
  const timed = beatTiming(short);
  const narration = stripTags(script.narration);
  const planned = await planVisuals(timed, narration, inputs, meter);
  const beats = await Promise.all(
    planned.map(async (shot) => {
      const beat = { ...shot, accent: onScreenText(shot, script, planned.length) };
      const photo = await makePhoto(photoPrompt(beat, inputs), meter);
      const imageKey = keyFor(short.id, `frame-${beat.idx}.jpg`);
      await putObject(imageKey, photo, 'image/jpeg');
      return { ...beat, imageKey };
    }),
  );
  return { beats: json(beats) };
};

/** A clip already paid for (a re-run after a failed download): fetch it again instead of generating a new one. */
const reuseClip = async (beat: ShortBeat): Promise<Buffer | null> =>
  beat.clipSourceUrl && !beat.clipKey ? downloadUrl(beat.clipSourceUrl).catch(() => null) : null;

const clipFor = async (short: ShortReel, beat: ShortBeat, meter: CostMeter): Promise<ShortBeat> => {
  const model = short.videoModel as ShortVideoModel;
  const t0 = Date.now();
  const seconds = genSeconds(model, beat.spanS);
  const prompt = videoPrompt(beat);
  const source: ClipSource = { taskId: beat.clipTaskId, url: beat.clipSourceUrl };
  const base = { ...beat, genS: seconds, videoPrompt: prompt };
  try {
    if (beat.clipKey) return beat;
    const frame = beat.imageKey ? await getObject(beat.imageKey) : null;
    if (!frame || !beat.imageKey) throw new Error('Photo missing');
    const onSource = (s: ClipSource) => Object.assign(source, s);
    const clip = (await reuseClip(beat)) ?? (await makeClip(model, { prompt, seconds, frame, frameKey: beat.imageKey, onSource }, meter));
    const clipKey = keyFor(short.id, `clip-${beat.idx}.mp4`);
    await putObject(clipKey, clip, 'video/mp4');
    return { ...base, clipKey, clipTaskId: source.taskId, clipSourceUrl: source.url, clipError: null, clipMs: Date.now() - t0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...base, clipKey: undefined, clipTaskId: source.taskId, clipSourceUrl: source.url, clipError: clipText(message, 500), clipMs: Date.now() - t0 };
  }
};

const clipStep: StepFn = async (short, meter) => {
  const beats = short.beats as unknown as ShortBeat[];
  const done = await Promise.all(beats.map((b) => clipFor(short, b, meter)));
  if (done.every((b) => b.clipError)) {
    // Keep the task ids and URLs: a re-run from this step can then download clips already paid for.
    await prisma.shortReel.update({ where: { id: short.id }, data: { beats: json(done) } });
    throw new Error(`Every clip failed. First error: ${done[0]?.clipError ?? 'unknown'}`);
  }
  return { beats: json(done) };
};

/** The hook styled and placed by Auto Fit on the first photo (every render, so a new photo or hook gets a fresh look). */
const placeHook = async (parts: RenderBeat[]): Promise<RenderBeat[]> => {
  const first = parts[0];
  if (!first?.beat.accent || first.beat.role !== 'hook') return parts;
  // Previews at the default spot (an earlier render's style and position are dropped).
  const beat: ShortBeat = { ...first.beat, accentTopY: undefined, accentFitReason: undefined, accentStyle: undefined, accentStyleReason: undefined };
  const fit = await fitHook(first.photo, beat.accent ?? '', (style) => previewFrame(first.photo, { ...beat, accentStyle: style }));
  const placedBeat: ShortBeat = {
    ...beat,
    accentStyle: fit.style,
    accentStyleReason: fit.styleReason,
    ...(fit.topY !== null ? { accentTopY: fit.topY, accentFitReason: fit.reason } : {}),
  };
  return [{ ...first, beat: placedBeat }, ...parts.slice(1)];
};

const renderStep: StepFn = async (short) => {
  const beats = short.beats as unknown as ShortBeat[];
  const audio = short.audio as unknown as ShortAudio;
  const wav = await getObject(audio.key);
  if (!wav) throw new Error('Voice file missing');
  const parts = await Promise.all(
    beats.map(async (beat) => {
      const photo = beat.imageKey ? await getObject(beat.imageKey) : null;
      if (!photo) throw new Error(`Photo of shot ${beat.idx + 1} missing`);
      return { beat, photo, clip: beat.clipKey ? await getObject(beat.clipKey) : null };
    }),
  );
  const placed = await placeHook(parts);
  const { video, poster } = await renderShort(placed, wav);
  const videoKey = keyFor(short.id, 'short.mp4');
  const posterKey = keyFor(short.id, 'poster.jpg');
  await Promise.all([putObject(videoKey, video, 'video/mp4'), putObject(posterKey, poster, 'image/jpeg')]);
  return { videoKey, posterKey, beats: json(placed.map((p) => p.beat)) };
};

const STEPS: Record<ShortStep, StepFn> = { 1: scriptStep, 2: makeVoiceStep(true), 3: photoStep, 4: clipStep, 5: renderStep };
/** Steps that start in their own invocation on Vercel (2 when it runs with 3: voice and photos together). */
const FRESH_INVOCATION = new Set<ShortStep>([3, 4, 5]);

const locks = new Map<string, Promise<unknown>>();
/** One write at a time per short: voice and photos run side by side and both read-modify-write its JSON columns. */
const serialized = <T>(id: string, fn: () => Promise<T>): Promise<T> => {
  const run = (locks.get(id) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => undefined);
  locks.set(id, tail);
  void tail.then(() => {
    if (locks.get(id) === tail) locks.delete(id);
  });
  return run;
};

/** A re-run step keeps what earlier attempts spent as one line, so the total is what was really paid. */
const withEarlier = (cost: StepCost, earlier: StepCost | undefined): StepCost =>
  earlier?.usdMicros ? { usdMicros: cost.usdMicros + earlier.usdMicros, items: [...cost.items, { label: 'Earlier attempts', usdMicros: earlier.usdMicros }] } : cost;

const saveStep = (id: string, step: ShortStep, ms: number, cost: StepCost, data: Prisma.ShortReelUpdateInput) =>
  serialized(id, async () => {
    const short = await load(id);
    const timings = short.stepTimings as Record<string, number>;
    const costs = short.stepCosts as Record<string, StepCost>;
    await prisma.shortReel.update({
      where: { id },
      data: { ...data, stepTimings: json({ ...timings, [step]: (timings[step] ?? 0) + ms }), stepCosts: json({ ...costs, [step]: withEarlier(cost, costs[step]) }) },
    });
  });

type Failure = { step: ShortStep; message: string };

/** One step: runs it on the latest short and saves its checkpoint, time and cost. A failure is returned, not thrown. */
const runStep = async (id: string, step: ShortStep, fn: StepFn = STEPS[step]): Promise<Failure | null> => {
  const t0 = Date.now();
  const meter = createMeter();
  try {
    const data = await fn(await load(id), meter);
    await saveStep(id, step, Date.now() - t0, meter.summary(), data);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[shorts] ${id} step ${step} FAILED:`, message);
    await saveStep(id, step, Date.now() - t0, meter.summary(), {}).catch(() => undefined);
    return { step, message };
  }
};

const markRunning = (id: string, step: ShortStep) =>
  prisma.shortReel.update({ where: { id }, data: { status: `STEP_${step}_RUNNING`, error: null, failedStep: null } });

/** Runs `fn` and returns its result with how long it took. */
const clocked = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t0 = Date.now();
  return [await fn(), Date.now() - t0];
};

/**
 * Steps 2 and 3 side by side, then the photos moved onto the real voice. The status shows 3 once the voice is done.
 * Each step keeps its own time; the time they overlapped is saved as a negative `overlap` entry so the short's total
 * time (the sum of its step times) stays the real elapsed time.
 */
const runVoiceAndPhotos = async (id: string): Promise<Failure | null> => {
  await markRunning(id, 2);
  const [[[voice, voiceMs], [photos, photoMs]], wallMs] = await clocked(() =>
    Promise.all([
      clocked(() => runStep(id, 2, makeVoiceStep(false))).then(async (r) => {
        if (!r[0]) await prisma.shortReel.updateMany({ where: { id, status: 'STEP_2_RUNNING' }, data: { status: 'STEP_3_RUNNING' } });
        return r;
      }),
      clocked(() => runStep(id, 3)),
    ]),
  );
  await serialized(id, async () => {
    const short = await load(id);
    const timings = short.stepTimings as Record<string, number>;
    const overlap = (timings.overlap ?? 0) - Math.max(0, voiceMs + photoMs - wallMs);
    const beats = voice || photos ? null : retimed(short, short.audio as unknown as ShortAudio);
    await prisma.shortReel.update({ where: { id }, data: { stepTimings: json({ ...timings, overlap }), ...(beats ? { beats: json(beats) } : {}) } });
  });
  return voice ?? photos;
};

/** True when a fresh invocation took over from `step`. */
const handOff = async (id: string, step: ShortStep): Promise<boolean> => {
  if (process.env.VERCEL !== '1') return false;
  try {
    await prisma.shortReel.update({ where: { id }, data: { status: `STEP_${step}_RUNNING` } });
    const res = await fetch(`${appBaseUrl()}/api/admin/shorts/${id}/continue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signAdminToken()}` },
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[shorts] hand-off of ${id} failed; continuing inline:`, err instanceof Error ? err.message : err);
    return false;
  }
};

const ALL_STEPS: ShortStep[] = [1, 2, 3, 4, 5];
/** A voice swap: new narration, then the render; photos and clips stay. */
export const VOICE_SWAP_STEPS: ShortStep[] = [2, 5];

/** Runs steps `fromStep`…5 (only those in `steps`). Never throws: a failure is saved on the short with its step. */
export const runShortPipeline = async (id: string, fromStep: ShortStep = 1, continued = false, steps: ShortStep[] = ALL_STEPS): Promise<void> => {
  for (let step = fromStep; step <= 5; step = (step + 1) as ShortStep) {
    if (!steps.includes(step)) continue;
    const together = step === 2 && steps.includes(3);
    if ((together || FRESH_INVOCATION.has(step)) && !(continued && step === fromStep) && (await handOff(id, step))) return;
    const failure = together ? await runVoiceAndPhotos(id) : await markRunning(id, step).then(() => runStep(id, step));
    if (failure) {
      await prisma.shortReel.update({ where: { id }, data: { status: 'FAILED', failedStep: failure.step, error: clipText(failure.message, 1_000), finishedAt: new Date() } });
      return;
    }
    if (together) step = 3;
  }
  await prisma.shortReel.update({ where: { id }, data: { status: 'COMPLETED', finishedAt: new Date() } });
};
