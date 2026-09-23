/**
 * Blitz Lab — Slideshow (CAROUSEL) Composition
 *
 * Renders an array of text slides sequentially over a looping background video
 * or image. No chroma key, no overlay layer.
 *
 * Layer order (bottom → top):
 *   1. Background  — full-bleed image or video (loops if shorter than clip)
 *   2. Slide text  — one caption per slide, fades in over 4 frames
 *   3. Business    — optional pill, same as GreenScreenComposition
 *   4. Audio       — optional, volume fade at end
 */

import { useEffect, useMemo, useRef } from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadBlitzFonts } from './fontLoader';
import { BusinessLayer, CaptionLayer } from './TextLayers';
import type { SlideshowProps } from './types';

/** Returns true if the URL looks like a static image (not a video). */
const isImageUrl = (url: string) =>
  /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url);

/** Plain <img> background — avoids Remotion's img.decode() CORS issue on R2 URLs. */
function BackgroundImg({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const handle = useMemo(() => delayRender('Loading background image'), []);
  useEffect(() => {
    const img = ref.current;
    if (!img) { continueRender(handle); return; }
    if (img.complete && img.naturalWidth > 0) { continueRender(handle); return; }
    const onLoad = () => continueRender(handle);
    const onError = () => continueRender(handle);
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    return () => { img.removeEventListener('load', onLoad); img.removeEventListener('error', onError); };
  }, [handle]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  );
}

const AUDIO_FADE_FRAMES = 15;
const SLIDE_FADE_FRAMES = 4;

// Load fonts at module level, same as GreenScreenComposition.
loadBlitzFonts();

export function SlideshowComposition({
  backgroundUrl,
  backgroundIsImage,
  audioUrl,
  muteVideoAudio,
  businessText,
  slides,
  textConfig,
}: SlideshowProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const nonEmptySlides = slides.filter((s) => s.text.trim());
  const count = Math.max(1, nonEmptySlides.length);
  const framesPerSlide = durationInFrames / count;

  // Which slide is active at the current frame?
  const slideIndex = Math.min(Math.floor(frame / framesPerSlide), count - 1);
  const currentSlide = nonEmptySlides[slideIndex];
  const currentText = currentSlide?.text ?? '';

  // Per-slide background: use slide's own URL or fall back to the global one
  const slideBgUrl = currentSlide?.backgroundUrl ?? backgroundUrl;
  const slideBgIsImage = currentSlide?.backgroundIsImage ?? (backgroundIsImage ?? isImageUrl(slideBgUrl));

  // Frame within the current slide (0-based)
  const frameInSlide = frame - slideIndex * framesPerSlide;

  // Opacity for text fade-in: fade in over SLIDE_FADE_FRAMES at the start of each slide
  const textOpacity = interpolate(
    frameInSlide,
    [0, SLIDE_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Audio volume: fade to 0 in the last AUDIO_FADE_FRAMES
  const fadeStart = durationInFrames - AUDIO_FADE_FRAMES;
  const audioVolume = interpolate(
    frame,
    [0, fadeStart, durationInFrames],
    [1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* ── Layer 1: Background (per-slide or global fallback) ──────────── */}
      <AbsoluteFill>
        {slideBgIsImage ? (
          <BackgroundImg src={slideBgUrl} />
        ) : (
          <OffthreadVideo
            src={slideBgUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted={muteVideoAudio}
            onError={() => undefined}
          />
        )}
      </AbsoluteFill>

      {/* ── Layer 2: Slide text (fades in on each slide transition) ────── */}
      {currentText ? (
        <AbsoluteFill style={{ opacity: textOpacity }}>
          <CaptionLayer text={currentText} config={textConfig} width={width} height={height} />
        </AbsoluteFill>
      ) : null}

      {/* ── Layer 3: Business line (optional, shown on every slide) ─────── */}
      {businessText?.trim() ? <BusinessLayer text={businessText.trim()} config={textConfig} height={height} /> : null}

      {/* ── Audio (optional) ────────────────────────────────────────────── */}
      {audioUrl ? <Audio src={audioUrl} volume={audioVolume} onError={() => undefined} /> : null}
    </AbsoluteFill>
  );
}
