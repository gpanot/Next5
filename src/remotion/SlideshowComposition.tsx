/**
 * Blitz Lab — Slideshow (CAROUSEL) Composition
 *
 * Renders an array of text slides sequentially over a looping background video
 * or image. No chroma key, no overlay layer.
 *
 * Layer order (bottom → top):
 *   1. Background  — full-bleed image or video (loops if shorter than clip); photos with a camera move (CameraStill)
 *   2. Slide text  — one caption per slide: word by word (plain style) or a 4-frame fade (boxed styles)
 *   3. Business    — optional pill, same as GreenScreenComposition
 *   4. Audio       — optional, loops if shorter than the video, volume fade at end
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
import { CameraStill } from './CameraStill';
import { loadBlitzFonts } from './fontLoader';
import { slideTextConfig } from './slideTextConfig';
import { BusinessLayer, CaptionLayer } from './TextLayers';
import type { SlideshowProps } from './types';
import { WordPopCaption } from './WordPopCaption';

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
function BackgroundImg({ src, fit = 'cover', blur = false }: { src: string; fit?: 'cover' | 'contain'; blur?: boolean }) {
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
    <img
      ref={ref}
      src={src}
      alt=""
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        display: 'block',
        ...(blur ? { filter: 'blur(40px) brightness(0.6)', transform: 'scale(1.15)' } : {}),
      }}
    />
  );
}

const AUDIO_FADE_FRAMES = 15;
const SLIDE_FADE_FRAMES = 4;

// Load fonts at module level, same as GreenScreenComposition.
loadBlitzFonts();

/**
 * Per-slide text layer with its own entrance (word pop, or a fade for boxed captions).
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
  // Plain captions pop in word by word; boxed ones keep the fade so the box does not grow word by word.
  if (!config.textBackground) return <WordPopCaption text={text} config={config} width={width} height={height} />;
  return (
    <AbsoluteFill style={{ opacity }}>
      <CaptionLayer text={text} config={config} width={width} height={height} />
    </AbsoluteFill>
  );
}

/** Start frame and length of each slide: fixed per-slide durations when all slides carry one, else an even split. */
function slideTimeline(slides: SlideshowProps['slides'], durationInFrames: number, fps: number) {
  const count = Math.max(1, slides.length);
  if (slides.length > 0 && slides.every((s) => (s.durationSec ?? 0) > 0)) {
    let from = 0;
    return slides.map((s, i) => {
      const frames = i === count - 1
        ? Math.max(1, durationInFrames - from)
        : Math.round((s.durationSec ?? 0) * fps);
      const entry = { from, duration: frames };
      from += frames;
      return entry;
    });
  }
  const framesPerSlide = durationInFrames / count;
  return slides.map((_, i) => {
    const from = Math.floor(i * framesPerSlide);
    return { from, duration: i === count - 1 ? durationInFrames - from : Math.floor(framesPerSlide) };
  });
}

export function SlideshowComposition({
  backgroundUrl,
  backgroundIsImage,
  audioUrl,
  audioStartAt,
  muteVideoAudio,
  businessText,
  slides,
  textConfig,
}: SlideshowProps) {
  const { durationInFrames, width, height, fps } = useVideoConfig();

  // Image-only slides (text already drawn on the picture) count as slides too.
  const nonEmptySlides = slides.filter((s) => s.text.trim() || s.backgroundUrl);
  const timeline = slideTimeline(nonEmptySlides, durationInFrames, fps);

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
        const { from, duration } = timeline[i]!;

        const bgUrl = slide.backgroundUrl ?? backgroundUrl;
        // Hook (first) and CTA (last) may have their own look.
        const config = slideTextConfig(textConfig, i, nonEmptySlides.length);
        const bgIsImage =
          slide.backgroundIsImage ?? (backgroundIsImage ?? isImageUrl(bgUrl));

        return (
          <Sequence key={i} from={from} durationInFrames={duration} layout="none">
            {/* Background */}
            <AbsoluteFill>
              {bgIsImage && slide.camera && slide.fit !== 'contain' ? (
                <CameraStill
                  src={bgUrl}
                  camera={slide.camera}
                  depth={slide.depth}
                  durationInFrames={duration}
                  filterId={`slide-camera-${i}`}
                />
              ) : bgIsImage && slide.fit === 'contain' ? (
                <>
                  <AbsoluteFill style={{ overflow: 'hidden' }}><BackgroundImg src={bgUrl} blur /></AbsoluteFill>
                  <AbsoluteFill><BackgroundImg src={bgUrl} fit="contain" /></AbsoluteFill>
                </>
              ) : bgIsImage ? (
                <BackgroundImg src={bgUrl} />
              ) : (
                <OffthreadVideo
                  src={bgUrl}
                  startFrom={Math.round((slide.trimStart ?? 0) * fps)}
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
                config={slide.positionY != null ? { ...config, positionY: slide.positionY } : config}
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
      {/* Loops (from the start point) when the track is shorter than the video, so the end is never silent. */}
      {audioUrl ? (
        <Audio
          src={audioUrl}
          loop
          volume={audioVolume}
          trimBefore={Math.max(0, Math.round((audioStartAt ?? 0) * fps))}
          onError={() => undefined}
        />
      ) : null}
    </AbsoluteFill>
  );
}
