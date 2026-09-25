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
import { ensureBrowserDecodableKey } from './transcode';
import type { GreenScreenProps, SlideshowProps, TextConfig } from '../../src/remotion/types';

const RENDER_OUTPUT_KEY = (projectId: string) => `blitz/renders/${projectId}/output.mp4`;

export async function renderProject(
  project: BlitzProject,
  template: BlitzTemplate,
  serveUrl: string,
): Promise<string> {
  const jobId = project.id;
  // Only the rendered output.mp4 and any overlay transcode go to disk —
  // the rest of the assets are streamed via HTTPS.
  const tmpDir = path.join('/tmp', `blitz_${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // ── 1. Parse stored JSON ────────────────────────────────────────────
    type SlideInput = string | {
      text: string;
      backgroundKey?: string;
      /** Fixed slide length (7-shot deck videos). */
      durationSec?: number;
      /** Start offset into a video background, seconds. */
      trimStart?: number;
      /** Per-slide caption position (TextConfig.positionY scale). */
      positionY?: number;
    };
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
      /** Slide data (CAROUSEL type only): string[] for legacy, SlideInput[] for new format */
      slides?: SlideInput[];
    };

    // Is this a Slideshow render?
    const isCarousel = template.type === 'CAROUSEL';

    // Merge template's textConfig with any per-project editor overrides
    const baseTextConfig = template.textConfig as TextConfig;
    const textConfig: TextConfig = currentAssets.textConfigOverride
      ? { ...baseTextConfig, ...currentAssets.textConfigOverride }
      : baseTextConfig;

    // ── 2. Generate 1-hour presigned HTTPS URLs for each asset ───────────
    // Remotion 4.x does NOT support file:// URIs in headless Chrome or in the
    // compositor's asset downloader. Signed HTTPS URLs work correctly, and on
    // Railway (same Cloudflare region as R2) latency is <10 ms.
    // The overlay goes through WebCodecs in the browser (see transcode.ts), so it
    // may need an H.264 copy first. Background and audio are decoded by ffmpeg,
    // which handles every codec we accept.

    console.log(`[render:${jobId}] Generating presigned R2 URLs…`);

    const backgroundUrl = await getPresignedUrl(currentAssets.backgroundKey);
    const audioUrl = currentAssets.audioKey ? await getPresignedUrl(currentAssets.audioKey) : undefined;

    // ── 3. Build inputProps ───────────────────────────────────────────────
    const seconds = currentAssets.durationSeconds ?? template.durationSeconds;
    const durationInFrames = Math.max(1, Math.round(seconds * template.fps));

    const chromiumOptions = {
      disableWebSecurity: true,
      gl: (process.platform === 'darwin' ? 'angle' : 'swangle') as 'angle' | 'swangle',
    };
    const browserExecutable = process.env.CHROMIUM_PATH || undefined;
    const outputPath = path.join(tmpDir, 'output.mp4');

    // ── 4. Select composition and render ─────────────────────────────────
    if (isCarousel) {
      // ── CAROUSEL / Slideshow path ───────────────────────────────────────
      // Support both legacy string[] and new SlideData[] formats.
      const rawSlides = (currentAssets.slides ?? [project.captionText]).map(
        (s: SlideInput) => (typeof s === 'string' ? { text: s } : s),
      );
      const filteredSlides = rawSlides.filter((s) => s.text.trim());

      // Generate presigned URLs for per-slide backgrounds (if any).
      const slides: SlideshowProps['slides'] = await Promise.all(
        filteredSlides.map(async (s) => {
          const timing = {
            ...(s.durationSec ? { durationSec: s.durationSec } : {}),
            ...(s.trimStart ? { trimStart: s.trimStart } : {}),
            ...(s.positionY != null ? { positionY: s.positionY } : {}),
          };
          if (!s.backgroundKey) return { text: s.text, ...timing };
          const bgUrl = await getPresignedUrl(s.backgroundKey);
          return {
            text: s.text,
            ...timing,
            backgroundUrl: bgUrl,
            backgroundIsImage: /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(bgUrl),
          };
        }),
      );

      const inputProps: SlideshowProps = {
        backgroundUrl,
        audioUrl,
        muteVideoAudio: currentAssets.muteVideoAudio ?? false,
        businessText: currentAssets.businessText,
        slides,
        textConfig,
        durationInFrames,
        fps: template.fps,
      };

      console.log(`[render:${jobId}] Selecting composition "Slideshow" (${slides.length} slides)…`);
      const composition = await selectComposition({
        serveUrl,
        id: 'Slideshow',
        inputProps,
        browserExecutable,
        chromiumOptions,
      });

      console.log(`[render:${jobId}] Rendering ${durationInFrames} frames @ ${template.fps} fps…`);
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
      });
      process.stdout.write('\n');
    } else {
      // ── GreenScreen path ────────────────────────────────────────────────
      const overlayKey = await ensureBrowserDecodableKey(
        currentAssets.overlayKey,
        tmpDir,
        (message) => console.log(`[render:${jobId}] ${message}`),
      );

      const [overlayUrl] = await Promise.all([getPresignedUrl(overlayKey)]);

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
          if (log.text.includes('falling back to <OffthreadVideo>')) {
            overlayFallbackDetected = true;
          }
        },
      });
      process.stdout.write('\n');

      if (overlayFallbackDetected) {
        throw new Error(
          'Overlay video could not be decoded by the browser, so the chroma key was skipped. ' +
            `Overlay key: ${overlayKey}`,
        );
      }
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
