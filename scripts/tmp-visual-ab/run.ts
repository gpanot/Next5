// A/B test of the Visual Bible on an existing short: same script, voice and timing; new photos (FLUX.2) and clips
// (Seedance 2.0 Mini), rendered with the baseline voice. Never writes to the database; files go to R2 under shorts-ab/.
// Usage: OUT=<dir> tsx --env-file=.env.local scripts/tmp-visual-ab/run.ts <shortId> <prompts|photos|clips|render>

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { prisma } from '../../src/lib/db';
import { createMeter } from '../../src/server/metaAds/cost';
import { getObject, putObject } from '../../src/server/storage/objectStore';
import { genSeconds } from '../../src/server/shorts/beats';
import { makeClip, makePhoto } from '../../src/server/shorts/media';
import { renderShort } from '../../src/server/shorts/render';
import { sanitizeImagePrompt, videoPrompt } from '../../src/server/shorts/visuals';
import { stripTags } from '../../src/server/shorts/voice';
import type { MotionHint, ShortAudio, ShortBeat, ShortInputs, ShortScriptAttempt } from '../../src/types/admin/shorts';
import { anchorPrompt, checkPhoto as checkRef, flux, photoCount, publicUrl, refNote } from './ref';
import { bibleStyle, buildBible, checkPhoto, planShot, siteImages, storyboard, type Bible, type Board } from './bible';

const MOTIONS: MotionHint[] = ['static', 'slow_zoom_in', 'slow_zoom_out', 'pan_left', 'pan_right', 'ken_burns'];
type State = { bible: Bible; images: string[]; boards: (Board | null)[]; beats: (ShortBeat & { photoPrompt?: string })[]; costUsd?: number };

async function main() {
  const [id, phase] = process.argv.slice(2) as [string, string];
  const dir = `${process.env.OUT}/${id}`;
  mkdirSync(dir, { recursive: true });
  const stateFile = `${dir}/state.json`;
  const short = await prisma.shortReel.findUniqueOrThrow({ where: { id } });
  const inputs = short.inputs as unknown as ShortInputs;
  const attempts = short.attempts as unknown as ShortScriptAttempt[];
  const narration = stripTags(attempts[attempts.length - 1]!.script.narration);
  const baseBeats = short.beats as unknown as ShortBeat[];
  const meter = createMeter();

  if (phase === 'prompts') {
    const run = await prisma.autoSlideshowRun.findFirst({ where: { workspaceId: short.workspaceId, profile: { not: { equals: null } } }, orderBy: { createdAt: 'desc' }, select: { url: true, profile: true } });
    const profile = run!.profile as Record<string, unknown>;
    const images = await siteImages(run!.url, profile.heroImageUrl as string | null);
    console.log('images', images);
    const bible = await buildBible(inputs, profile, images);
    console.log(JSON.stringify(bible, null, 2));
    const timed = baseBeats.map(({ idx, role, text, startS, spanS, accent }) => ({ idx, role, text, startS, spanS, accent }) as ShortBeat);
    const boards = await storyboard(timed, bible, inputs);
    const beats = await Promise.all(
      timed.map(async (b) => {
        const raw = await planShot(b, narration, inputs, bible, boards);
        const imagePrompt = sanitizeImagePrompt((raw.image_prompt ?? b.text).trim());
        const motionHint = MOTIONS.includes(raw.motion_hint as MotionHint) ? (raw.motion_hint as MotionHint) : b.role === 'payoff' ? 'static' : 'slow_zoom_in';
        const motionAction = raw.motion_action?.replace(/\b(very )?(slowly|gently|gracefully|in slow motion)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
        return { ...b, rawImagePrompt: raw.image_prompt, imagePrompt, motionHint, motionAction, photoPrompt: `${imagePrompt.replace(/\.$/, '')}. ${bibleStyle(bible)}` };
      }),
    );
    writeFileSync(stateFile, JSON.stringify({ bible, images, boards, beats } satisfies State, null, 2));
    beats.forEach((b) => console.log(`\n#${b.idx} ${b.role}: ${b.text}\n  ${b.photoPrompt}`));
    return;
  }

  const state = JSON.parse(readFileSync(stateFile, 'utf8')) as State;
  if (phase === 'photos') {
    state.beats = await Promise.all(
      state.beats.map(async (b) => {
        let photo = await makePhoto(b.photoPrompt!, meter);
        const qa = await checkPhoto(photo, b.text, b.photoPrompt!).catch(() => ({ ok: true }) as { ok?: boolean; problem?: string; fix?: string });
        console.log(`#${b.idx} QA ${qa.ok ? 'ok' : `REJECT: ${qa.problem} | fix: ${qa.fix}`}`);
        if (!qa.ok) {
          writeFileSync(`${dir}/rejected-frame-${b.idx}.jpg`, photo);
          b.photoPrompt = `${b.photoPrompt} ${qa.fix ?? ''}`.trim();
          photo = await makePhoto(b.photoPrompt, meter);
          const again = await checkPhoto(photo, b.text, b.photoPrompt).catch(() => ({ ok: true }) as { ok?: boolean; problem?: string });
          console.log(`#${b.idx} QA retry ${again.ok ? 'ok' : `still: ${again.problem}`}`);
        }
        const imageKey = `shorts-ab/${id}/frame-${b.idx}.jpg`;
        await putObject(imageKey, photo, 'image/jpeg');
        writeFileSync(`${dir}/new-frame-${b.idx}.jpg`, photo);
        return { ...b, imageKey };
      }),
    );
  }
  if (phase === 'refphotos') {
    const anchorP = anchorPrompt(state.bible, state.boards);
    const anchor = await flux(anchorP);
    writeFileSync(`${dir}/anchor.jpg`, anchor);
    const anchorUrl = await publicUrl(`shorts-ab/${id}/anchor.jpg`, anchor);
    console.log('anchor:', anchorP);
    state.beats = await Promise.all(
      state.beats.map(async (b) => {
        let prompt = `${b.photoPrompt} ${refNote(state.bible)}`;
        let photo = await flux(prompt, [anchorUrl]);
        const qa = await checkRef(photo, anchorUrl, b.text, b.role, prompt).catch(() => ({ ok: true }) as { ok?: boolean; problem?: string; fix?: string });
        console.log(`#${b.idx} QA ${qa.ok ? 'ok' : `REJECT: ${qa.problem} | fix: ${qa.fix}`}`);
        if (!qa.ok) {
          writeFileSync(`${dir}/rejected-frame-${b.idx}.jpg`, photo);
          prompt = `${prompt} ${qa.fix ?? ''}`.trim();
          photo = await flux(prompt, [anchorUrl]);
          const again = await checkRef(photo, anchorUrl, b.text, b.role, prompt).catch(() => ({ ok: true }) as { ok?: boolean; problem?: string });
          console.log(`#${b.idx} QA retry ${again.ok ? 'ok' : `still: ${again.problem}`}`);
        }
        const imageKey = `shorts-ab/${id}/frame-${b.idx}.jpg`;
        await putObject(imageKey, photo, 'image/jpeg');
        writeFileSync(`${dir}/new-frame-${b.idx}.jpg`, photo);
        return { ...b, photoPrompt: prompt, imageKey, clipKey: undefined };
      }),
    );
    meter.add('FLUX.2 photos', photoCount * 28_000);
  }
  if (phase === 'clips') {
    state.beats = await Promise.all(
      state.beats.map(async (b) => {
        if (b.clipKey && !process.env.FORCE_CLIPS) return b;
        const seconds = genSeconds('seedance', b.spanS);
        const prompt = videoPrompt(b);
        const frame = (await getObject(b.imageKey!))!;
        try {
          // Unique key: reAPI serves a cached frame for a reused R2 path (2026-10-09 test).
          const frameKey = `shorts-ab/${id}/${Date.now()}-frame-${b.idx}.jpg`;
          await putObject(frameKey, frame, 'image/jpeg');
          const clip = await makeClip('seedance', { prompt, seconds, frame, frameKey, onSource: () => undefined }, meter);
          const clipKey = `shorts-ab/${id}/${Date.now()}-clip-${b.idx}.mp4`;
          await putObject(clipKey, clip, 'video/mp4');
          return { ...b, genS: seconds, videoPrompt: prompt, clipKey };
        } catch (err) {
          console.error(`clip ${b.idx} failed:`, err instanceof Error ? err.message : err);
          return b;
        }
      }),
    );
  }
  if (phase === 'render') {
    const audio = short.audio as unknown as ShortAudio;
    const wav = (await getObject(audio.key))!;
    const parts = await Promise.all(
      state.beats.map(async (b) => {
        const base = baseBeats[b.idx]!;
        const beat = { ...b, accent: base.accent, accentStyle: base.accentStyle };
        return { beat, photo: (await getObject(b.imageKey!))!, clip: b.clipKey ? await getObject(b.clipKey) : null };
      }),
    );
    const { video } = await renderShort(parts, wav);
    writeFileSync(`${dir}/new-short.mp4`, video);
    if (!existsSync(`${dir}/old-short.mp4`) && short.videoKey) writeFileSync(`${dir}/old-short.mp4`, (await getObject(short.videoKey))!);
    for (const b of baseBeats) if (b.imageKey && !existsSync(`${dir}/old-frame-${b.idx}.jpg`)) writeFileSync(`${dir}/old-frame-${b.idx}.jpg`, (await getObject(b.imageKey))!);
  }
  const usd = meter.summary().usdMicros / 1e6;
  state.costUsd = (state.costUsd ?? 0) + usd;
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(`${phase} done, $${usd.toFixed(3)} (total media $${state.costUsd.toFixed(3)})`);
}

main().finally(() => prisma.$disconnect());
