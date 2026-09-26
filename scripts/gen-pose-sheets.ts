/**
 * Makes the pose sheet of every Studio model: four photos of her (full body, walking, side, seated) in plain
 * basics on a clean studio background, with the same pipeline as shop photos (Nano Banana 2 edit on WaveSpeed,
 * her face + full-body photos as references). Made once by Next5 and shared by every seller.
 *
 * Writes public/images/business/shop/models/poses/<slug>-<pose>.png and records each file in
 * public/images/manifest.json. Skips files that already exist unless --force is passed.
 *
 *   node --env-file=.env.local --import tsx scripts/gen-pose-sheets.ts [--only=<slug>] [--force]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { POSE_SHEET_POSES, studioPosePath } from '../src/content/business/catalog/poseSheet';
import { STUDIO_MODELS, type StudioModelSeed } from '../src/content/business/catalog/studioModels';
import { SHOTS } from '../src/config/shots';
import { submitEdit, uploadPhotoToWaveSpeed, waitForTask } from '../src/lib/wavespeed';
import { composePoseSheetPrompt } from '../src/server/generation/composer/poseSheet';

const MANIFEST = 'public/images/manifest.json';
const OUTPUT_WIDTH = 800;

const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? null;

type Job = { out: string; prompt: string; model: StudioModelSeed; alt: string };

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, unknown>;
const refs = new Map<string, string[]>();

const upload = async (publicPath: string): Promise<string> =>
  uploadPhotoToWaveSpeed(await sharp(readFileSync(`public${publicPath}`)).jpeg({ quality: 92 }).toBuffer(), 'jpg');

/** Face then full body, uploaded once per model. */
const refsFor = async (model: StudioModelSeed): Promise<string[]> => {
  const known = refs.get(model.slug);
  if (known) return known;
  const urls = [await upload(model.faceImage), await upload(model.fullImage)];
  refs.set(model.slug, urls);
  return urls;
};

const jobsFor = (model: StudioModelSeed): Job[] =>
  POSE_SHEET_POSES.map((pose) => ({
    out: `public${studioPosePath(model.slug, pose)}`,
    prompt: composePoseSheetPrompt(pose, 2, true),
    model,
    alt: `${model.name}, Studio model: ${SHOTS[pose].label.toLowerCase()} pose`,
  }));

const run = async (job: Job): Promise<void> => {
  const taskId = await submitEdit({ imageUrls: await refsFor(job.model), prompt: job.prompt, aspectRatio: '4:5', resolution: '1k' });
  const url = await waitForTask(taskId, { timeoutMs: 240_000 });
  const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
  const png = await sharp(raw).resize({ width: OUTPUT_WIDTH, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(png).metadata();
  mkdirSync(dirname(job.out), { recursive: true });
  writeFileSync(job.out, png);
  manifest[job.out] = {
    prompt: job.prompt,
    model: `google/nano-banana-2/edit (WaveSpeed, references: ${job.model.slug} face + full body)`,
    size: '1k 4:5',
    outputSize: `${meta.width}x${meta.height}`,
    bytes: png.length,
    alt: job.alt,
    generatedAt: new Date().toISOString(),
  };
  console.log('✓', job.out);
};

/** Runs jobs a few at a time; one failure is logged and the rest carry on. Saves the manifest as it goes. */
const pool = async (jobs: Job[], size: number): Promise<number> => {
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      await run(job)
        .then(() => writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`))
        .catch((err: unknown) => { failed += 1; console.error('✗', job.out, err instanceof Error ? err.message : err); });
    }
  };
  await Promise.all(Array.from({ length: size }, worker));
  return failed;
};

const main = async () => {
  const jobs = STUDIO_MODELS.filter((m) => !only || m.slug === only).flatMap(jobsFor).filter((j) => force || !existsSync(j.out));
  console.log(`${jobs.length} photos to make`);
  const failed = await pool(jobs, 6);
  console.log(failed ? `${failed} failed — run again to retry them` : 'All done');
};

void main();
