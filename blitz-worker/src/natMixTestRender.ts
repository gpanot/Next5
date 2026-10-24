// Test (2026-10-24): an EQL slideshow as a Blitz video, plain and with Brand Nat overlays (scripts/tmp/nat-mix).
// Plans come from scripts/tmp/nat-mix/narrate.ts. Nothing is written to the DB.
// Run from blitz-worker/: node_modules/.bin/tsx --env-file=../.env.local src/natMixTestRender.ts <outDir>

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { getPresignedUrl } from './r2';
import type { SlideshowProps, SpokenWord, TextConfig } from '../../src/remotion/types';
import type { NatMixProps } from '../../scripts/tmp/nat-mix/remotion/NatRoot';

type PlanSlide = SlideshowProps['slides'][number] & { backgroundKey: string; durationSec: number; words: SpokenWord[] };
type Plan = { total: number; hook: string; slides: PlanSlide[] };
type Variant = { name: string; plan: 'A' | 'B'; nat: (plan: Plan, fps: number) => NatMixProps['nat']; redTitle?: boolean };

const OVERRIDE: Partial<TextConfig> = { fontSize: 74, strokeWidth: 0, positionY: 0.62 };

const secondsBefore = (plan: Plan, index: number) => plan.slides.slice(0, index).reduce((sum, s) => sum + s.durationSec, 0);
const hookFrames = (plan: Plan, fps: number) => Math.round((plan.slides[0]!.durationSec + 1) * fps);

const VARIANTS: Variant[] = [
  { name: 'v1-blitz-baseline', plan: 'A', redTitle: true, nat: () => ({}) },
  {
    name: 'v2-H10-V17', plan: 'B',
    nat: (plan, fps) => {
      const last = plan.slides.length - 1;
      const fit = plan.slides[last]!.words.find((w) => /^fit/i.test(w.word));
      return {
        hook: { style: 'h10', top: 'Hips, not waist', bottom: 'decide legging comfort', y: 600, frames: hookFrames(plan, fps) },
        cta: { keyword: 'FIT', from: Math.round(secondsBefore(plan, last) * fps), keywordAt: Math.round((fit?.startS ?? 0.8) * fps) - 3, y: 560 },
      };
    },
  },
  {
    name: 'v3-H4-V22', plan: 'A',
    nat: (plan, fps) => ({
      hook: { style: 'h4', top: 'did you know', bottom: 'hips decide fit.', y: 600, frames: hookFrames(plan, fps) },
      pinned: { text: 'save this for your next legging order', y: 1330 },
    }),
  },
];

const loadPlan = async (dir: string, name: string): Promise<Plan> => {
  const plan = JSON.parse(fs.readFileSync(path.join(dir, `plan-${name}.json`), 'utf8')) as Plan;
  const slides = await Promise.all(plan.slides.map(async (s) => ({ ...s, backgroundUrl: await getPresignedUrl(s.backgroundKey), backgroundIsImage: true })));
  return { ...plan, slides };
};

const main = async () => {
  const dir = path.resolve(process.argv[2] ?? '');
  const only = process.argv[3];
  const template = await prisma.blitzTemplate.findUniqueOrThrow({ where: { id: 'blitz-tmpl-carousel-v0' } });
  const fps = template.fps;
  const plans = { A: await loadPlan(dir, 'A'), B: await loadPlan(dir, 'B') };
  const serveUrl = await bundle({
    entryPoint: path.resolve(__dirname, '../../scripts/tmp/nat-mix/remotion/NatRoot.tsx'),
    webpackOverride: (config) => ({ ...config, resolve: { ...config.resolve, modules: [path.resolve(__dirname, '../node_modules'), 'node_modules'] } }),
  });
  const chromiumOptions = { disableWebSecurity: true, gl: 'angle' as const };
  for (const v of VARIANTS.filter((x) => !only || x.name.startsWith(only))) {
    const plan = plans[v.plan];
    const textConfig: TextConfig = { ...(template.textConfig as TextConfig), ...OVERRIDE,
      ...(v.redTitle ? { hookTitle: { text: plan.hook, style: 'tiktok-red' as const, positionY: 0.45 } } : {}) };
    const inputProps: NatMixProps = { backgroundUrl: plan.slides[0]!.backgroundUrl!, muteVideoAudio: true, slides: plan.slides, textConfig,
      durationInFrames: Math.round(plan.total * fps), fps, nat: v.nat(plan, fps) };
    const composition = await selectComposition({ serveUrl, id: 'NatMix', inputProps, chromiumOptions });
    const silent = path.join(dir, `${v.name}-silent.mp4`);
    await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: silent, inputProps, chromiumOptions, concurrency: 4,
      onProgress: ({ progress }) => process.stdout.write(`\r${v.name} ${Math.round(progress * 100)} %`) });
    const out = path.join(dir, `${v.name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, '-i', path.join(dir, `voice-${v.plan}.wav`), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out]);
    fs.rmSync(silent);
    console.log(`\ndone: ${out}`);
  }
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
