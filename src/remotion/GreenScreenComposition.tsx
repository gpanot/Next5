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
  interpolate,
  Loop,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
// Note: useCurrentFrame is used for audio fade interpolation
import type { GreenScreenProps } from './types';

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
      {/* Loop wraps the video so it repeats if shorter than durationInFrames. */}
      <AbsoluteFill>
        <Loop durationInFrames={durationInFrames}>
          <OffthreadVideo
            src={backgroundUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Loop>
      </AbsoluteFill>

      {/* ── Layer 2: Overlay (VP9-alpha WebM) ───────────────────────────── */}
      {/* VP9 alpha is preserved by OffthreadVideo; the AbsoluteFill has no  */}
      {/* background so the transparent areas show the layer below.          */}
      <AbsoluteFill
        style={{
          transform: [
            `translate(${overlayOffsetX}px, ${overlayOffsetY}px)`,
            `scale(${overlayZoom})`,
          ].join(' '),
          transformOrigin: 'center center',
        }}
      >
        <Loop durationInFrames={durationInFrames}>
          <OffthreadVideo
            src={overlayUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Loop>
      </AbsoluteFill>

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
      {audioUrl ? <Audio src={audioUrl} volume={audioVolume} /> : null}
    </AbsoluteFill>
  );
}
