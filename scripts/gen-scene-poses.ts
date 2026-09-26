/**
 * Makes the sample photo of every pose in every shop scene (src/content/business/catalog/shopScenes.ts),
 * with the web-imagery skill. One at a time, so the manifest is never written twice at once.
 * Existing photos are skipped. Usage: npx tsx scripts/gen-scene-poses.ts
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { SCENE_SAMPLES, scenePoseImage } from '../src/content/business/catalog/shopScenes';

const SCRIPT = path.join(homedir(), '.claude/skills/web-imagery/gen-image.mjs');
const MODEL = 'A white American woman model in her late 20s with long light brown hair';
const STYLE = 'Realistic e-commerce fashion photograph, natural skin texture, true-to-life colour, sharp focus, subject centered with even margin around her, plain surfaces without any lettering or signage.';

for (const scene of SCENE_SAMPLES) {
  for (const pose of scene.poses) {
    const out = `public${scenePoseImage(scene.id, pose.id)}`;
    if (existsSync(out)) continue;
    const prompt = `${MODEL} wearing ${scene.outfit}. ${pose.direction} Setting: ${scene.location} ${scene.lighting} ${STYLE}`;
    console.log(`→ ${scene.id} / ${pose.id}`);
    try {
      execFileSync('node', [SCRIPT, '--prompt', prompt, '--out', out, '--size', '1024x1280', '--max-width', '480', '--alt', `${pose.label} pose, ${scene.id} scene`], { stdio: 'inherit' });
    } catch {
      console.error(`✗ ${scene.id} / ${pose.id} failed, continuing`);
    }
  }
}
