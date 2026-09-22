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
import { getPresignedUrl, uploadToR2 } from './r2';
import type { GreenScreenProps, TextConfig } from '../../src/remotion/types';

const RENDER_OUTPUT_KEY = (projectId: string) => `blitz/renders/${projectId}/output.mp4`;

export async function renderProject(
  project: BlitzProject,
  template: BlitzTemplate,
  serveUrl: string,
): Promise<string> {
  const jobId = project.id;
  // Only the rendered output.mp4 goes to disk — assets are streamed via HTTPS.
  const tmpDir = path.join('/tmp', `blitz_${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // ── 1. Parse stored JSON ────────────────────────────────────────────
    const currentAssets = project.currentAssets as {
      backgroundKey: string;
      overlayKey: string;
      audioKey?: string;
      /** Optional per-project text style overrides from the editor */
      textConfigOverride?: Partial<TextConfig>;
    };

    // Merge template's textConfig with any per-project editor overrides
    const baseTextConfig = template.textConfig as TextConfig;
    const textConfig: TextConfig = currentAssets.textConfigOverride
      ? { ...baseTextConfig, ...currentAssets.textConfigOverride }
      : baseTextConfig;

    // ── 2. Generate 1-hour presigned HTTPS URLs for each asset ───────────
    // Remotion 4.x does NOT support file:// URIs in headless Chrome or in the
    // compositor's asset downloader. Signed HTTPS URLs work correctly, and on
    // Railway (same Cloudflare region as R2) latency is <10 ms.
    console.log(`[render:${jobId}] Generating presigned R2 URLs…`);
    const [backgroundUrl, overlayUrl, audioUrl] = await Promise.all([
      getPresignedUrl(currentAssets.backgroundKey),
      getPresignedUrl(currentAssets.overlayKey),
      currentAssets.audioKey ? getPresignedUrl(currentAssets.audioKey) : Promise.resolve(undefined),
    ]);

    // ── 3. Build inputProps ───────────────────────────────────────────────
    const durationInFrames = Math.round(template.durationSeconds * template.fps);
    const inputProps: GreenScreenProps = {
      backgroundUrl,
      overlayUrl,
      audioUrl,
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
    // NOTE: In Remotion v4.x, the executable path is a top-level `browserExecutable`
    // parameter — NOT inside `chromiumOptions` (which only contains browser flags).
    const browserExecutable = process.env.CHROMIUM_PATH || undefined;

    console.log(`[render:${jobId}] Selecting composition "GreenScreen"…`);
    const composition = await selectComposition({
      serveUrl,
      id: 'GreenScreen',
      inputProps,
      browserExecutable,
    });

    console.log(`[render:${jobId}] Rendering ${durationInFrames} frames @ ${template.fps} fps…`);
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      browserExecutable,
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
