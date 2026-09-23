/**
 * Remotion entry point — registers all Blitz Lab compositions.
 *
 * In v0 only GreenScreen is implemented; BROLL_VIDEO and CAROUSEL are stubs.
 * This file is the `entryPoint` used by:
 *   - `npx remotion studio` (local preview / Checkpoint 2 verification)
 *   - `blitz-worker/src/index.ts` via `bundle({ entryPoint })`
 */

import { Composition, registerRoot } from 'remotion';
import { GreenScreenComposition } from './GreenScreenComposition';
import { SlideshowComposition } from './SlideshowComposition';
import type { GreenScreenProps, SlideshowProps } from './types';

// Default props used by Remotion Studio for previewing without live data
const STUDIO_DEFAULT_PROPS: GreenScreenProps = {
  backgroundUrl:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
  overlayUrl: '', // replace with a local alpha-WebM path in Remotion Studio
  captionText: 'You are gonna FALL in love with this one 🏡',
  overlayZoom: 1.0,
  overlayOffsetX: 0,
  overlayOffsetY: 0,
  textConfig: {
    font: 'sans-serif',
    positionY: 0.15,
    fontSize: 52,
    safeZonePadding: 48,
  },
  durationInFrames: 150, // 5 s @ 30 fps
  fps: 30,
};

// Default props for the Slideshow composition in Remotion Studio
const SLIDESHOW_DEFAULT_PROPS: SlideshowProps = {
  backgroundUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080',
  slides: [
    { text: 'Slide 1 — First compelling point' },
    { text: 'Slide 2 — Second point' },
    { text: 'Slide 3 — CTA' },
  ],
  textConfig: {
    font: 'sans-serif',
    positionY: 0.15,
    fontSize: 52,
    safeZonePadding: 48,
  },
  durationInFrames: 450, // 15 s @ 30 fps
  fps: 30,
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="GreenScreen"
        component={GreenScreenComposition}
        durationInFrames={STUDIO_DEFAULT_PROPS.durationInFrames}
        fps={STUDIO_DEFAULT_PROPS.fps}
        width={1080}
        height={1920}
        defaultProps={STUDIO_DEFAULT_PROPS}
        // Length and fps come from each render's props (clip length = shortest video).
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames, fps: props.fps })}
      />
      <Composition
        id="Slideshow"
        component={SlideshowComposition}
        durationInFrames={SLIDESHOW_DEFAULT_PROPS.durationInFrames}
        fps={SLIDESHOW_DEFAULT_PROPS.fps}
        width={1080}
        height={1920}
        defaultProps={SLIDESHOW_DEFAULT_PROPS}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames, fps: props.fps })}
      />
    </>
  );
};

// Required by Remotion bundler — must be the last line of the entry point.
registerRoot(RemotionRoot);
