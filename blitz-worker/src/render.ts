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
      /** Clip length from the editor (shortest video layer); falls back to the template. */
      durationSeconds?: number;
      /** Business line, present only when the user turned it on. */
      businessText?: string;
      muteVideoAudio?: boolean;
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
    const seconds = currentAssets.durationSeconds ?? template.durationSeconds;
    const durationInFrames = Math.max(1, Math.round(seconds * template.fps));
    const inputProps: GreenScreenProps = {
      backgroundUrl,
      overlayUrl,
      audioUrl,
      muteVideoAudio: currentAssets.muteVideoAudio ?? false,
      businessText: currentAssets.businessText,
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

    // Disable CORS in the headless browser so that presigned R2 URLs can be fetched
    // by the @remotion/media Video component (which uses the Fetch API internally).
    // This is required for the colorKey() WebGL effect to load the overlay video.
    // Without this, Chrome blocks cross-origin fetches from localhost:3001 → R2,
    // causing Remotion to fall back to <OffthreadVideo> which doesn't support
    // WebGL effects — leaving the green screen visible in the output.
    //
    // `gl` is mandatory for colorKey(): the effect needs a WebGL2 context, and
    // headless Chrome has none with the default renderer. Symptoms without it:
    //   - h264 overlay  → render throws "Failed to acquire WebGL2 context"
    //   - hevc overlay  → WebCodecs decode fails first, <Video> falls back to
    //                     <OffthreadVideo> (no effects) → green stays in output.
    // "angle" uses the GPU (macOS dev); Linux containers have no GPU, so they
    // need the SwiftShader-backed "swangle".
    const chromiumOptions = {
      disableWebSecurity: true,
      gl: (process.platform === 'darwin' ? 'angle' : 'swangle') as 'angle' | 'swangle',
    };

    console.log(`[render:${jobId}] Selecting composition "GreenScreen"…`);
    const composition = await selectComposition({
      serveUrl,
      id: 'GreenScreen',
      inputProps,
      browserExecutable,
      chromiumOptions,
    });

    console.log(`[render:${jobId}] Rendering ${durationInFrames} frames @ ${template.fps} fps…`);
    let overlayFallbackDetected = false;
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      browserExecutable,
      chromiumOptions,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r[render:${jobId}] ${Math.round(progress * 100)} %`);
      },
      onBrowserLog: (log) => {
        // <Video> silently degrades to <OffthreadVideo> when the browser cannot
        // decode the file (e.g. HEVC). That path drops colorKey(), so the output
        // would ship with the green background still visible. Fail loudly instead.
        if (log.text.includes('falling back to <OffthreadVideo>')) {
          overlayFallbackDetected = true;
        }
      },
    });
    process.stdout.write('\n');

    if (overlayFallbackDetected) {
      throw new Error(
        'Overlay video could not be decoded by the browser, so the chroma key was skipped. ' +
          'Re-encode the overlay as H.264 (yuv420p) and upload it again.',
      );
    }

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
