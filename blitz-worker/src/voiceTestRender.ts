// Test (2026-10-12): renders a narrated Blitz plan from scripts/tmp/blitz-voice/narrate.ts locally, then muxes the
// voice on (voice only, and voice over the card's music at low volume). Nothing is written to the DB or R2.
// Run from blitz-worker/: node_modules/.bin/tsx --env-file=../.env.local src/voiceTestRender.ts <outDir>

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { getPresignedUrl } from './r2';
import type { SlideshowProps, TextConfig } from '../../src/remotion/types';

type PlanSlide = SlideshowProps['slides'][number] & { backgroundKey?: string };
type Plan = { total: number; slides: PlanSlide[]; body: { templateId: string; textConfigOverride?: Partial<TextConfig>; currentAssets: { audioKey?: string } } };

const PHOTO = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
/** Music under the voice, as a fraction of full volume. */
const MUSIC_BED = 0.12;

const main = async () => {
  const dir = path.resolve(process.argv[2] ?? '');
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8')) as Plan;
  const template = await prisma.blitzTemplate.findUniqueOrThrow({ where: { id: plan.body.templateId } });
  const textConfig = { ...(template.textConfig as TextConfig), ...plan.body.textConfigOverride };
  const slides = await Promise.all(
    plan.slides.map(async ({ backgroundKey, ...s }) => {
      const backgroundUrl = backgroundKey ? await getPresignedUrl(backgroundKey) : undefined;
      return { ...s, backgroundUrl, backgroundIsImage: !!backgroundKey && PHOTO.test(backgroundKey) };
    }),
  );
  const durationInFrames = Math.round(plan.total * template.fps);
  const inputProps: SlideshowProps = { backgroundUrl: slides[0].backgroundUrl ?? '', muteVideoAudio: true, slides, textConfig, durationInFrames, fps: template.fps };

  const serveUrl = await bundle({
    entryPoint: path.resolve(__dirname, '../../src/remotion/Root.tsx'),
    webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, modules: [path.resolve(__dirname, '../node_modules'), 'node_modules'] } }),
  });
  const chromiumOptions = { disableWebSecurity: true, gl: 'angle' as const };
  const composition = await selectComposition({ serveUrl, id: 'Slideshow', inputProps, chromiumOptions });
  const silent = path.join(dir, 'silent.mp4');
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: silent, inputProps, chromiumOptions, concurrency: 4,
    onProgress: ({ progress }) => process.stdout.write(`\r${Math.round(progress * 100)} %`) });

  const voice = path.join(dir, 'voice.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', voice, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', path.join(dir, 'voice-only.mp4')]);
  const musicKey = plan.body.currentAssets.audioKey;
  if (musicKey) {
    const music = await getPresignedUrl(musicKey);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', voice, '-i', music,
      '-filter_complex', `[2:a]volume=${MUSIC_BED},afade=t=out:st=${(plan.total - 0.6).toFixed(2)}:d=0.6[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', path.join(dir, 'voice-music.mp4')]);
  }
  console.log(`\ndone: ${dir}`);
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
