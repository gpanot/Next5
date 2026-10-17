// Test (2026-10-17): renders a plan from scripts/tmp/blitz-synced-captions/narrate.ts locally (caption = spoken line,
// words shown as they are said), with the camera moves and depth parallax of a real render, then muxes the voice on.
// Nothing is written to the DB.
// Run from blitz-worker/: node_modules/.bin/tsx --env-file=../.env.local src/spokenTestRender.ts <outDir> <plan-whisper|plan-estimate>

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { ensureDepthMaps } from './depth';
import { getPresignedUrl } from './r2';
import type { SlideCamera, SlideshowProps, TextConfig } from '../../src/remotion/types';

type PlanSlide = SlideshowProps['slides'][number] & { backgroundKey?: string; camera?: SlideCamera };
type Plan = { total: number; slides: PlanSlide[]; body: { templateId: string; textConfigOverride?: Partial<TextConfig> } };

const PHOTO = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

const withBackground = async ({ backgroundKey, ...s }: PlanSlide, tmp: string): Promise<SlideshowProps['slides'][number]> => {
  if (!backgroundKey) return s;
  const backgroundUrl = await getPresignedUrl(backgroundKey);
  const backgroundIsImage = PHOTO.test(backgroundKey);
  if (!backgroundIsImage || !s.camera || s.fit === 'contain') return { ...s, backgroundUrl, backgroundIsImage };
  const maps = await ensureDepthMaps(backgroundKey, tmp).catch(() => null);
  if (!maps) return { ...s, backgroundUrl, backgroundIsImage };
  const [radialUrl, truckUrl] = await Promise.all([getPresignedUrl(maps.radialKey), getPresignedUrl(maps.truckKey)]);
  return { ...s, backgroundUrl, backgroundIsImage, depth: { radialUrl, truckUrl, spread: maps.spread } };
};

const main = async () => {
  const dir = path.resolve(process.argv[2] ?? '');
  const name = process.argv[3] ?? 'plan-whisper';
  const plan = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8')) as Plan;
  const template = await prisma.blitzTemplate.findUniqueOrThrow({ where: { id: plan.body.templateId } });
  const textConfig = { ...(template.textConfig as TextConfig), ...plan.body.textConfigOverride };
  const tmp = fs.mkdtempSync(path.join(dir, 'depth-'));
  const slides = await Promise.all(plan.slides.map((s) => withBackground(s, tmp)));
  const durationInFrames = Math.round(plan.total * template.fps);
  const inputProps: SlideshowProps = { backgroundUrl: slides[0]?.backgroundUrl ?? '', muteVideoAudio: true, slides, textConfig, durationInFrames, fps: template.fps };

  const serveUrl = await bundle({
    entryPoint: path.resolve(__dirname, '../../src/remotion/Root.tsx'),
    webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, modules: [path.resolve(__dirname, '../node_modules'), 'node_modules'] } }),
  });
  const chromiumOptions = { disableWebSecurity: true, gl: 'angle' as const };
  const composition = await selectComposition({ serveUrl, id: 'Slideshow', inputProps, chromiumOptions });
  const silent = path.join(dir, `${name}-silent.mp4`);
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: silent, inputProps, chromiumOptions, concurrency: 4,
    onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)} %`) });
  const out = path.join(dir, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', path.join(dir, 'voice.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out]);
  fs.rmSync(silent);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\ndone: ${out}`);
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
