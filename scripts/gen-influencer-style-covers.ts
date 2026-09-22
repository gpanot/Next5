/**
 * Makes the first sample photo (the style cover) for Brand styles that have none yet, with the pipeline
 * influencer variations use: the demo face's identity lock + the style's locked shot → Gemini 3 Pro Image
 * on reAPI, 9:16. Same face as every other sample (public/images/business/us/influencer/sarah-face.png).
 *
 * Writes public/images/business/us/influencer/brand/<template>-1.png and records it in public/images/manifest.json.
 * Skips styles that already have a cover unless --force is passed.
 *
 *   node --env-file=.env.local --import tsx scripts/gen-influencer-style-covers.ts [--only=<templateId>] [--force]
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { ALL_BRAND_TEMPLATES } from '../src/content/business/catalog/templates';
import { influencerShotFor } from '../src/content/business/catalog/influencerShots';
import { generateGeminiImage } from '../src/lib/reapiImage';
import { uploadPhotoToWaveSpeed } from '../src/lib/wavespeed';
import { composeLockedPrompt } from '../src/server/generation/composer/portraitClone';
import { lockFromImage } from '../src/server/influencers/identityLock';

const ROOT = 'public/images/business/us/influencer';
const MANIFEST = 'public/images/manifest.json';
const OUTPUT_WIDTH = 720;

const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? null;
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, unknown>;

const main = async () => {
  const face = await sharp(readFileSync(`${ROOT}/sarah-face.png`)).jpeg({ quality: 92 }).toBuffer();
  const faceUrl = await uploadPhotoToWaveSpeed(face, 'jpg');
  const identity = await lockFromImage(`data:image/jpeg;base64,${face.toString('base64')}`);
  console.log(identity ? 'identity locked' : 'no identity lock — the reference image carries the face');

  const jobs = ALL_BRAND_TEMPLATES
    .filter((t) => !only || t.id === only)
    .map((t) => ({ template: t, out: `${ROOT}/brand/${t.id}-1.png` }))
    .filter((j) => force || !existsSync(j.out));
  console.log(`${jobs.length} covers to make`);

  let failed = 0;
  await Promise.all(jobs.map(async ({ template, out }) => {
    const prompt = composeLockedPrompt({ id: `sarah_${template.id.replace(/-/g, '_')}`, identity, shot: influencerShotFor(template.id), withReference: true });
    try {
      const url = await generateGeminiImage({ prompt, imageUrls: [faceUrl], ratio: '9:16', resolution: '1K' }, { timeoutMs: 240_000 });
      const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
      const png = await sharp(raw).resize({ width: OUTPUT_WIDTH, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
      const meta = await sharp(png).metadata();
      writeFileSync(out, png);
      manifest[out] = {
        prompt,
        model: 'gemini-3-pro-image-preview (reAPI, reference: sarah-face.png, portrait-clone locked prompt)',
        size: '1K 9:16',
        outputSize: `${meta.width}x${meta.height}`,
        bytes: png.length,
        alt: `Sarah in the ${template.name} style`,
        generatedAt: new Date().toISOString(),
      };
      console.log('✓', out);
    } catch (err) {
      failed += 1;
      console.error('✗', out, err instanceof Error ? err.message : err);
    }
  }));
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(failed ? `${failed} failed — run again to retry them` : 'All done');
};

void main();
