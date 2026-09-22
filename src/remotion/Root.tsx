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
import type { GreenScreenProps } from './types';

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
      />
    </>
  );
};

// Required by Remotion bundler — must be the last line of the entry point.
registerRoot(RemotionRoot);
