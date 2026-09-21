/**
 * Generates the demo influencer's sample photos for every Brand style and Shop look, with the same
 * pipeline customers use (Nano Banana 2 + our prompt composer), so "Sarah" keeps one face everywhere.
 * Her base portrait comes from the web-imagery skill (public/images/business/us/influencer/sarah-face.png).
 *
 * Writes public/images/business/us/influencer/{brand|shop}/<template>-<n>.png and records each file in
 * public/images/manifest.json. Skips files that already exist unless --force is passed.
 *
 *   node --env-file=.env.local --import tsx scripts/gen-influencer-samples.ts [--only=<templateId>] [--force]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';
import { BRAND_TEMPLATES, SHOP_TEMPLATES } from '../src/content/business/catalog/templates';
import type { SetTemplateSeed, ThemeScene } from '../src/content/business/catalog/types';
import { submitEdit, uploadPhotoToWaveSpeed, waitForTask } from '../src/lib/wavespeed';
import { composeBrandPrompt } from '../src/server/generation/composer/brand';
import { composeShopPrompt } from '../src/server/generation/composer/shop';
import type { ShotId } from '../src/config/shots';

const ROOT = 'public/images/business/us/influencer';
const MANIFEST = 'public/images/manifest.json';
const SAMPLES_PER_STYLE = 4;
const OUTPUT_WIDTH = 800;

const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? null;

/** Four everyday realtor moments, so each style shows range: posed, candid, working, close. */
const BRAND_SCENES: ThemeScene[] = [
  { id: 'hero', label: 'Hero', direction: 'Standing relaxed and confident, facing the camera with a warm smile, three-quarter framing.' },
  { id: 'candid', label: 'Candid', direction: 'Laughing naturally mid-conversation, looking slightly off camera, as if talking with a client.' },
  { id: 'working', label: 'Working', direction: 'Holding a tablet showing a listing, glancing up at the camera with a friendly expression.' },
  { id: 'close', label: 'Close', direction: 'Close portrait from the chest up, soft smile, eyes to camera, background gently blurred.' },
];

type Garment = { file: string; category: string; name: string; colorName: string; shot: ShotId };

/** The same three demo products as the marketing slider: she wears or carries each one. */
const GARMENTS: Garment[] = [
  { file: 'public/images/business/shop/slider/dress-before.png', category: 'dress', name: 'Satin midi slip dress', colorName: 'sage green', shot: 'full_body_front' },
  { file: 'public/images/business/shop/slider/set-before.png', category: 'set', name: 'Ribbed-knit cardigan and midi skirt set', colorName: 'cream', shot: 'full_body_front' },
  { file: 'public/images/business/shop/slider/bag-before.png', category: 'bag', name: 'Structured leather shoulder bag', colorName: 'tan', shot: 'half_body' },
  { file: 'public/images/business/shop/slider/dress-before.png', category: 'dress', name: 'Satin midi slip dress', colorName: 'sage green', shot: 'half_body' },
];

type Job = { out: string; prompt: string; images: string[]; alt: string };

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, unknown>;

const upload = async (path: string): Promise<string> => uploadPhotoToWaveSpeed(await sharp(readFileSync(path)).jpeg({ quality: 92 }).toBuffer(), 'jpg');

const brandJobs = (sarah: string, templates: readonly SetTemplateSeed[]): Job[] =>
  templates.flatMap((t) =>
    BRAND_SCENES.slice(0, SAMPLES_PER_STYLE).map((scene, index) => ({
      out: `${ROOT}/brand/${t.id}-${index + 1}.png`,
      images: [sarah],
      alt: `Sarah in the ${t.name} style: ${scene.label.toLowerCase()} shot`,
      prompt: composeBrandPrompt({
        template: t.config, set: { locations: [], wardrobe: null, poseEnergy: null, brandColors: [] },
        scene, index, sceneCount: BRAND_SCENES.length, format: 'portrait_4_5', industry: 'realtor', identityImageCount: 1,
      }),
    })),
  );

const shopJobs = (sarah: string, garmentUrls: Map<string, string>, templates: readonly SetTemplateSeed[]): Job[] =>
  templates.flatMap((t) =>
    GARMENTS.slice(0, SAMPLES_PER_STYLE).map((g, index) => ({
      out: `${ROOT}/shop/${t.id}-${index + 1}.png`,
      images: [sarah, garmentUrls.get(g.file)!],
      alt: `Sarah wearing a ${g.colorName} ${g.category} in the ${t.name} look`,
      prompt: composeShopPrompt({
        template: t.config, garment: { category: g.category, name: g.name, colorName: g.colorName, fit: null, notes: null },
        shot: g.shot, format: 'portrait_4_5', identityImageCount: 1, productImageCount: 1, isStudioModel: false,
      }),
    })),
  );

const run = async (job: Job): Promise<void> => {
  const taskId = await submitEdit({ imageUrls: job.images, prompt: job.prompt, aspectRatio: '4:5', resolution: '1k' });
  const url = await waitForTask(taskId, { timeoutMs: 240_000 });
  const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
  const png = await sharp(raw).resize({ width: OUTPUT_WIDTH, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  const meta = await sharp(png).metadata();
  mkdirSync(dirname(job.out), { recursive: true });
  writeFileSync(job.out, png);
  manifest[job.out] = {
    prompt: job.prompt,
    model: 'google/nano-banana-2/edit (WaveSpeed, reference: sarah-face.png)',
    size: '1k 4:5',
    outputSize: `${meta.width}x${meta.height}`,
    bytes: png.length,
    alt: job.alt,
    generatedAt: new Date().toISOString(),
  };
  console.log('✓', job.out);
};

/** Runs jobs a few at a time; one failure is logged and the rest carry on. */
const pool = async (jobs: Job[], size: number): Promise<number> => {
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      await run(job).catch((err: unknown) => { failed += 1; console.error('✗', job.out, err instanceof Error ? err.message : err); });
    }
  };
  await Promise.all(Array.from({ length: size }, worker));
  return failed;
};

const main = async () => {
  const sarah = await upload(`${ROOT}/sarah-face.png`);
  const garmentUrls = new Map<string, string>();
  for (const g of GARMENTS) if (!garmentUrls.has(g.file)) garmentUrls.set(g.file, await upload(g.file));
  const pick = (list: readonly SetTemplateSeed[]) => list.filter((t) => !only || t.id === only);
  const jobs = [...brandJobs(sarah, pick(BRAND_TEMPLATES)), ...shopJobs(sarah, garmentUrls, pick(SHOP_TEMPLATES))].filter((j) => force || !existsSync(j.out));
  console.log(`${jobs.length} photos to make`);
  const failed = await pool(jobs, 6);
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(failed ? `${failed} failed — run again to retry them` : 'All done');
};

void main();
