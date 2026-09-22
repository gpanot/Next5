/**
 * Blitz Worker — render one BlitzProject with Remotion.
 *
 * Key rules (from the plan):
 *  1. serveUrl is cached at startup and passed in — bundle() is NOT called here.
 *  2. Assets are downloaded to /tmp/blitz_${jobId}/ before renderMedia() so
 *     headless Chromium reads local files, not streaming R2/S3 URLs.
 *  3. Temp dir is cleaned up after the render regardless of success/failure.
 */

import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
import type { BlitzProject, BlitzTemplate } from '@prisma/client';
import { downloadFromR2, uploadToR2 } from './r2';
import type { GreenScreenProps, TextConfig } from '../../src/remotion/types';

const RENDER_OUTPUT_KEY = (projectId: string) => `blitz/renders/${projectId}/output.mp4`;

export async function renderProject(
  project: BlitzProject,
  template: BlitzTemplate,
  serveUrl: string,
): Promise<string> {
  const jobId = project.id;
  const tmpDir = path.join('/tmp', `blitz_${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // ── 1. Parse stored JSON ────────────────────────────────────────────
    const currentAssets = project.currentAssets as {
      backgroundKey: string;
      overlayKey: string;
      audioKey?: string;
    };
    const textConfig = template.textConfig as TextConfig;

    // ── 2. Download assets to local disk ────────────────────────────────
    const bgExt = path.extname(currentAssets.backgroundKey) || '.mp4';
    const ovExt = path.extname(currentAssets.overlayKey) || '.webm';
    const bgPath = path.join(tmpDir, `background${bgExt}`);
    const ovPath = path.join(tmpDir, `overlay${ovExt}`);

    console.log(`[render:${jobId}] Downloading assets from R2…`);
    await Promise.all([
      downloadFromR2(currentAssets.backgroundKey, bgPath),
      downloadFromR2(currentAssets.overlayKey, ovPath),
    ]);

    let audioPath: string | undefined;
    if (currentAssets.audioKey) {
      const audioExt = path.extname(currentAssets.audioKey) || '.mp3';
      audioPath = path.join(tmpDir, `audio${audioExt}`);
      await downloadFromR2(currentAssets.audioKey, audioPath);
    }

    // ── 3. Build inputProps (URLs = local file:// paths) ─────────────────
    const durationInFrames = Math.round(template.durationSeconds * template.fps);
    const inputProps: GreenScreenProps = {
      backgroundUrl: `file://${bgPath}`,
      overlayUrl: `file://${ovPath}`,
      audioUrl: audioPath ? `file://${audioPath}` : undefined,
      captionText: project.captionText,
      overlayZoom: project.overlayZoom,
      overlayOffsetX: project.overlayOffsetX,
      overlayOffsetY: project.overlayOffsetY,
      textConfig,
      durationInFrames,
      fps: template.fps,
    };

    // ── 4. Select composition and render ─────────────────────────────────
    const outputPath = path.join(tmpDir, 'output.mp4');
    // CHROMIUM_PATH is required in Docker (set to /usr/bin/chromium).
    // Locally on macOS, leave it unset and let Remotion find Chrome automatically.
    const chromiumOptions = process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {};

    console.log(`[render:${jobId}] Selecting composition "GreenScreen"…`);
    const composition = await selectComposition({
      serveUrl,
      id: 'GreenScreen',
      inputProps,
      chromiumOptions,
    });

    console.log(`[render:${jobId}] Rendering ${durationInFrames} frames @ ${template.fps} fps…`);
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      chromiumOptions,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r[render:${jobId}] ${Math.round(progress * 100)} %`);
      },
    });
    process.stdout.write('\n');

    // ── 5. Upload rendered .mp4 to R2 ────────────────────────────────────
    const r2Key = RENDER_OUTPUT_KEY(jobId);
    console.log(`[render:${jobId}] Uploading to R2 key: ${r2Key}`);
    await uploadToR2(outputPath, r2Key, 'video/mp4');

    return r2Key;
  } finally {
    // ── 6. Cleanup temp dir ───────────────────────────────────────────────
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      console.warn(`[render:${jobId}] Failed to clean up ${tmpDir}`);
    }
  }
}
