/**
 * Blitz Lab — Green Screen Composition
 *
 * Fixed layer order (bottom → top):
 *   1. Background  — full-bleed image or video
 *   2. Overlay     — VP9-alpha WebM meme/broll clip, transformed by zoom + offset
 *   3. Caption     — text positioned via textConfig.positionY
 *   4. Business    — optional pill with the agent / business line
 *
 * Audio (optional):
 *   - Plays from frame 0, volume fades to 0 over the last AUDIO_FADE_FRAMES frames
 *
 * Clip length = durationInFrames, set by the editor to the shortest video layer,
 * so nothing freezes or goes black. Longer layers and audio are trimmed.
 */

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
import { BusinessLayer, CaptionLayer } from './TextLayers';
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
  muteVideoAudio,
  businessText,
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
            muted={muteVideoAudio}
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
            muted={muteVideoAudio}
            onError={() => undefined}
          />
        </AbsoluteFill>
      ) : null}

      {/* ── Layer 3: Caption ────────────────────────────────────────────── */}
      {captionText ? <CaptionLayer text={captionText} config={textConfig} width={width} height={height} /> : null}

      {/* ── Layer 4: Business line (optional) ───────────────────────────── */}
      {businessText?.trim() ? <BusinessLayer text={businessText.trim()} config={textConfig} height={height} /> : null}

      {/* ── Audio (optional) ────────────────────────────────────────────── */}
      {audioUrl ? (
        <Audio src={audioUrl} volume={audioVolume} onError={() => undefined} />
      ) : null}
    </AbsoluteFill>
  );
}
