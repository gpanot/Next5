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

import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { GreenScreenProps } from './types';

/** Returns true if the URL looks like a static image (not a video). */
const isImageUrl = (url: string) =>
  /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url);

const AUDIO_FADE_FRAMES = 15;

export function GreenScreenComposition({
  backgroundUrl,
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

  // Caption Y position in px (bottom-anchored using positionY fraction)
  const captionBottom = height * (1 - textConfig.positionY);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* ── Layer 1: Background ─────────────────────────────────────────── */}
      {/* Supports both static images (jpg/png/webp) and video files.          */}
      {/* Assets should match template.durationSeconds.                        */}
      <AbsoluteFill>
        {isImageUrl(backgroundUrl) ? (
          <Img
            src={backgroundUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
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
          }}
        >
          <p
            style={{
              fontFamily: textConfig.font,
              fontSize: textConfig.fontSize,
              color: '#fff',
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
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
