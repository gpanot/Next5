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
  Sequence,
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

/**
 * Plain <img> background — avoids Remotion's img.decode() CORS issue on R2 URLs.
 *
 * IMPORTANT: this component must be keyed by its src so React remounts it (and
 * therefore calls delayRender) every time the background changes.  When it is
 * merely updated in-place (src prop change without remount), useMemo([]) does
 * not re-run and Remotion never waits for the new image to load — causing text
 * to change one frame before the background arrives.
 */
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

/**
 * Per-slide text layer with its own fade-in.
 * Rendered inside a per-slide Sequence so useCurrentFrame() returns the offset
 * within the slide, not the global timeline position.
 */
function SlideTextLayer({
  text,
  config,
  width,
  height,
}: {
  text: string;
  config: SlideshowProps['textConfig'];
  width: number;
  height: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, SLIDE_FADE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <CaptionLayer text={text} config={config} width={width} height={height} />
    </AbsoluteFill>
  );
}

export function SlideshowComposition({
  backgroundUrl,
  backgroundIsImage,
  audioUrl,
  muteVideoAudio,
  businessText,
  slides,
  textConfig,
}: SlideshowProps) {
  const { durationInFrames, width, height } = useVideoConfig();

  const nonEmptySlides = slides.filter((s) => s.text.trim());
  const count = Math.max(1, nonEmptySlides.length);
  const framesPerSlide = durationInFrames / count;

  // Audio volume: fade to 0 in the last AUDIO_FADE_FRAMES
  const frame = useCurrentFrame();
  const fadeStart = durationInFrames - AUDIO_FADE_FRAMES;
  const audioVolume = interpolate(
    frame,
    [0, fadeStart, durationInFrames],
    [1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/*
       * ── Layers 1 & 2: One Sequence per slide for BOTH background and text ──
       *
       * Rendering each slide in its own dedicated Sequence pair guarantees that:
       *  • BackgroundImg is REMOUNTED (not just prop-updated) on every slide
       *    change, so delayRender() fires and Remotion waits for the new image
       *    before capturing that frame.
       *  • SlideTextLayer is also remounted, so useCurrentFrame() resets to 0
       *    inside each sequence — the fade-in starts correctly at the slide
       *    boundary rather than being computed from the global timeline.
       *  • Background and text always start on the exact same frame — no desync.
       *
       * The previous single-Sequence approach updated `from` and `src` in-place,
       * which broke delayRender (useMemo deps=[]) and caused text to appear
       * ~0.3–0.5 s before the background image finished loading.
       */}
      {nonEmptySlides.map((slide, i) => {
        const from = Math.floor(i * framesPerSlide);
        const duration =
          i === count - 1
            ? durationInFrames - from
            : Math.floor(framesPerSlide);

        const bgUrl = slide.backgroundUrl ?? backgroundUrl;
        const bgIsImage =
          slide.backgroundIsImage ?? (backgroundIsImage ?? isImageUrl(bgUrl));

        return (
          <Sequence key={i} from={from} durationInFrames={duration} layout="none">
            {/* Background */}
            <AbsoluteFill>
              {bgIsImage ? (
                <BackgroundImg src={bgUrl} />
              ) : (
                <OffthreadVideo
                  src={bgUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted={muteVideoAudio}
                  onError={() => undefined}
                />
              )}
            </AbsoluteFill>

            {/* Text — fades in at the start of its own Sequence */}
            {slide.text.trim() ? (
              <SlideTextLayer
                text={slide.text}
                config={textConfig}
                width={width}
                height={height}
              />
            ) : null}
          </Sequence>
        );
      })}

      {/* ── Layer 3: Business line (optional, shown on every slide) ─────── */}
      {businessText?.trim() ? (
        <BusinessLayer text={businessText.trim()} config={textConfig} height={height} />
      ) : null}

      {/* ── Audio (optional) ────────────────────────────────────────────── */}
      {audioUrl ? (
        <Audio src={audioUrl} volume={audioVolume} onError={() => undefined} />
      ) : null}
    </AbsoluteFill>
  );
}
