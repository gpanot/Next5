/**
 * The hook title in the video (remotion/hookTitle.ts): on from the first frame, like a TikTok title, and gone with a
 * short fade at the end of its Sequence.
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { hookTitleConfig } from './hookTitle';
import { CaptionLayer } from './TextLayers';
import type { HookTitle, TextConfig } from './types';

const FADE_OUT_FRAMES = 6;

/** `durationInFrames`: the title's Sequence length (frames count from its start). */
type Props = { title: HookTitle; config: TextConfig; width: number; height: number; durationInFrames: number };

export function HookTitleLayer({ title, config, width, height, durationInFrames }: Props) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [durationInFrames - FADE_OUT_FRAMES, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity }}>
      <CaptionLayer text={title.text} config={hookTitleConfig(config, title)} width={width} height={height} />
    </AbsoluteFill>
  );
}
