/**
 * Blitz Lab — Green Screen Composition
 *
 * Fixed layer order (bottom → top):
 *   1. Background  — full-bleed image or video
 *   2. Overlay     — VP9-alpha WebM meme/broll clip, transformed by zoom + offset
 *   3. Caption     — text positioned via textConfig.positionY
 *
 * Audio (optional):
 *   - Plays from frame 0, volume fades to 0 over the last AUDIO_FADE_FRAMES frames
 *
 * All clip durations are trimmed / looped to match durationInFrames.
 */

import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { GreenScreenProps } from './types';

/** Returns true if the URL looks like a static image (not a video). */
const isImageUrl = (url: string) =>
  /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url);

/**
 * Renders a background image without using Remotion's <Img> component.
 *
 * Remotion's <Img> calls img.decode() internally, which fails for R2 signed URLs
 * in some browsers even when the image is perfectly valid (CORS-adjacent decode
 * rejection). Instead we use a plain <img> tag and manually call delayRender /
 * continueRender so Remotion still waits for the image before capturing frames.
 */
function BackgroundImg({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const handle = useMemo(() => delayRender('Loading background image'), []);

  useEffect(() => {
    const img = ref.current;
    if (!img) {
      continueRender(handle);
      return;
    }
    // Image is already cached / loaded
    if (img.complete && img.naturalWidth > 0) {
      continueRender(handle);
      return;
    }
    const onLoad = () => continueRender(handle);
    const onError = () => continueRender(handle); // Degrade gracefully — show blank frame
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [handle]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

const AUDIO_FADE_FRAMES = 15;

export function GreenScreenComposition({
  backgroundUrl,
  backgroundIsImage,
  overlayUrl,
  audioUrl,
  captionText,
  overlayZoom,
  overlayOffsetX,
  overlayOffsetY,
  textConfig,
}: GreenScreenProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // Audio volume: 1 during the clip, linearly fades to 0 in the last AUDIO_FADE_FRAMES
  const fadeStart = durationInFrames - AUDIO_FADE_FRAMES;
  const audioVolume = interpolate(
    frame,
    [0, fadeStart, durationInFrames],
    [1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Caption position: positionY is the fraction of canvas height from the top where the
  // caption bottom-edge sits. e.g. positionY=0.15 → caption bottom at 15% from top.
  const captionTopFraction = textConfig.positionY; // 0 = very top, 1 = very bottom
  // Convert to a paddingBottom so flex-end pushes the text to the right place.
  // paddingBottom = height - (positionY * height) = height * (1 - positionY)
  const captionBottom = height * (1 - captionTopFraction);

  const strokeW = textConfig.strokeWidth ?? 3;
  const strokeC = textConfig.strokeColor ?? '#000000';

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* ── Layer 1: Background ─────────────────────────────────────────── */}
      {/* Supports both static images (jpg/png/webp) and video files.          */}
      {/* Assets should match template.durationSeconds.                        */}
      <AbsoluteFill>
        {(backgroundIsImage ?? isImageUrl(backgroundUrl)) ? (
          <BackgroundImg src={backgroundUrl} />
        ) : (
          <OffthreadVideo
            src={backgroundUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            // Suppress unhandled rejection when the R2 file hasn't been uploaded yet
            onError={() => undefined}
          />
        )}
      </AbsoluteFill>

      {/* ── Layer 2: Overlay (VP9-alpha WebM) ───────────────────────────── */}
      {/* VP9 alpha channel is preserved by OffthreadVideo.                  */}
      {overlayUrl ? (
        <AbsoluteFill
          data-blitz-layer="OVERLAY"
          style={{
            transform: [
              `translate(${overlayOffsetX}px, ${overlayOffsetY}px)`,
              `scale(${overlayZoom})`,
            ].join(' '),
            transformOrigin: 'center center',
          }}
        >
          <OffthreadVideo
            src={overlayUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => undefined}
          />
        </AbsoluteFill>
      ) : null}

      {/* ── Layer 3: Caption ────────────────────────────────────────────── */}
      {captionText ? (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: captionBottom,
            paddingLeft: textConfig.safeZonePadding,
            paddingRight: textConfig.safeZonePadding,
            // Horizontal offset for text repositioning
            transform: textConfig.offsetX ? `translateX(${textConfig.offsetX}px)` : undefined,
          }}
        >
          <p
            data-blitz-layer="TEXT"
            style={{
              fontFamily: textConfig.font,
              fontSize: textConfig.fontSize,
              fontWeight: textConfig.fontWeight ?? 700,
              color: textConfig.color ?? '#ffffff',
              textAlign: 'center',
              // Stroke via webkit (works in headless Chrome / Remotion)
              ...(strokeW > 0
                ? ({ WebkitTextStroke: `${strokeW}px ${strokeC}` } as React.CSSProperties)
                : { textShadow: '0 2px 8px rgba(0,0,0,0.8)' }),
              margin: 0,
              lineHeight: 1.3,
              maxWidth: width - textConfig.safeZonePadding * 2,
            }}
          >
            {captionText}
          </p>
        </AbsoluteFill>
      ) : null}

      {/* ── Audio (optional) ────────────────────────────────────────────── */}
      {audioUrl ? (
        <Audio src={audioUrl} volume={audioVolume} onError={() => undefined} />
      ) : null}
    </AbsoluteFill>
  );
}
