// server-only — never import from a 'use client' file.
// Shorts pipeline: 1 script (+ fact check) → 2 voice → 3 shots + photos → 4 video clips → 5 render.
// Each step saves its checkpoint, time and cost on the short. On Vercel (300 s per function) clips and render each
// start in a fresh invocation via the continue route (photos too: the script step alone can take 2 min); locally the pipeline just keeps going.

import type { Prisma, ShortReel } from '@prisma/client';
import { signAdminToken } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import type { ShortAudio, ShortBeat, ShortInputs, ShortScriptAttempt, ShortStep, ShortVideoModel } from '../../types/admin/shorts';
import type { StepCost } from '../../types/admin/metaAds';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { clip as clipText } from '../metaAds/text';
import { appBaseUrl } from '../social/links';
import { getObject, putObject } from '../storage/objectStore';
import { genSeconds, planBeats } from './beats';
import { buildShortInputs } from './brand';
import { factCheck, factFeedback } from './factCheck';
import { downloadUrl } from './download';
import { makeClip, makePhoto, type ClipSource } from './media';
import { renderShort } from './render';
import { writeScript } from './script';
import { planAccents } from './accents';
import { photoPrompt, planVisuals, videoPrompt } from './visuals';
import { stripTags, synthesize, VOICE } from './voice';

const MAX_DRAFTS = 3;
const json = (v: unknown) => v as Prisma.InputJsonValue;
const load = (id: string) => prisma.shortReel.findUniqueOrThrow({ where: { id } });
const keyFor = (id: string, name: string) => `shorts/${id}/${name}`;

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
    const claims = await factCheck(script, inputs, meter);
    attempts.push({ script, claims });
    feedback = factFeedback(claims);
    if (!feedback) break;
  }
  return { inputs: json(inputs), attempts: json(attempts) };
};

const voiceStep: StepFn = async (short, meter) => {
  const { wav, durationS, words, sentences } = await synthesize(lastScript(short).narration, meter);
  const key = keyFor(short.id, 'voice.wav');
  await putObject(key, wav, 'audio/wav');
  const audio: ShortAudio = { key, durationS, voice: VOICE, words, sentences };
  return { audio: json(audio) };
};

const photoStep: StepFn = async (short, meter) => {
  const audio = short.audio as unknown as ShortAudio;
  const inputs = short.inputs as unknown as ShortInputs;
  const script = lastScript(short);
  const timed = planBeats(script, audio.words, audio.durationS);
  const narration = stripTags(script.narration);
  const [planned, accented] = await Promise.all([planVisuals(timed, narration, inputs, meter), planAccents(timed, inputs, meter)]);
  const beats = await Promise.all(
    planned.map(async (shot, i) => {
      const beat = { ...shot, accent: accented[i]?.accent ?? null };
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
  const { video, poster } = await renderShort(parts, wav, audio.words);
  const videoKey = keyFor(short.id, 'short.mp4');
  const posterKey = keyFor(short.id, 'poster.jpg');
  await Promise.all([putObject(videoKey, video, 'video/mp4'), putObject(posterKey, poster, 'image/jpeg')]);
  return { videoKey, posterKey };
};

const STEPS: Record<ShortStep, StepFn> = { 1: scriptStep, 2: voiceStep, 3: photoStep, 4: clipStep, 5: renderStep };
/** Steps that start in their own invocation on Vercel. */
const FRESH_INVOCATION = new Set<ShortStep>([3, 4, 5]);

/** A re-run step keeps what earlier attempts spent as one line, so the total is what was really paid. */
const withEarlier = (cost: StepCost, earlier: StepCost | undefined): StepCost =>
  earlier?.usdMicros ? { usdMicros: cost.usdMicros + earlier.usdMicros, items: [...cost.items, { label: 'Earlier attempts', usdMicros: earlier.usdMicros }] } : cost;

const saveStep = async (id: string, step: ShortStep, ms: number, cost: StepCost, data: Prisma.ShortReelUpdateInput) => {
  const short = await load(id);
  const timings = short.stepTimings as Record<string, number>;
  const costs = short.stepCosts as Record<string, StepCost>;
  await prisma.shortReel.update({
    where: { id },
    data: { ...data, stepTimings: json({ ...timings, [step]: (timings[step] ?? 0) + ms }), stepCosts: json({ ...costs, [step]: withEarlier(cost, costs[step]) }) },
  });
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

/** Runs steps `fromStep`…5. Never throws: a failure is saved on the short with its step. */
export const runShortPipeline = async (id: string, fromStep: ShortStep = 1, continued = false): Promise<void> => {
  for (let step = fromStep; step <= 5; step = (step + 1) as ShortStep) {
    if (FRESH_INVOCATION.has(step) && !(continued && step === fromStep) && (await handOff(id, step))) return;
    const t0 = Date.now();
    const meter = createMeter();
    try {
      await prisma.shortReel.update({ where: { id }, data: { status: `STEP_${step}_RUNNING`, error: null, failedStep: null } });
      const data = await STEPS[step](await load(id), meter);
      await saveStep(id, step, Date.now() - t0, meter.summary(), data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[shorts] ${id} step ${step} FAILED:`, message);
      await saveStep(id, step, Date.now() - t0, meter.summary(), {}).catch(() => undefined);
      await prisma.shortReel.update({ where: { id }, data: { status: 'FAILED', failedStep: step, error: clipText(message, 1_000), finishedAt: new Date() } });
      return;
    }
  }
  await prisma.shortReel.update({ where: { id }, data: { status: 'COMPLETED', finishedAt: new Date() } });
};
