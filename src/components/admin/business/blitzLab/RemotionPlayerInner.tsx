'use client';

/**
 * Inner Remotion player component — only ever imported via the dynamic()
 * wrapper in PreviewPlayer.tsx (ssr: false), so Remotion's browser APIs
 * are never touched during SSR.
 *
 * playFromStartSignal: increment this number to seek to frame 0 and play.
 * (We can't forward refs through dynamic() in Next.js, so we use a signal prop.)
 */

import { Player, type PlayerRef } from '@remotion/player';
import { useEffect, useRef } from 'react';
import { GreenScreenComposition } from '../../../../remotion/GreenScreenComposition';
import type { GreenScreenProps } from '../../../../remotion/types';

type Props = {
  inputProps: GreenScreenProps;
  /** Increment to seek to frame 0 and play from start. */
  playFromStartSignal: number;
};

export function RemotionPlayerInner({ inputProps, playFromStartSignal }: Props) {
  const playerRef = useRef<PlayerRef>(null);

  // When playFromStartSignal changes, seek to 0 and play.
  useEffect(() => {
    if (playFromStartSignal <= 0) return;
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, [playFromStartSignal]);

  return (
    <Player
      ref={playerRef}
      component={GreenScreenComposition}
      inputProps={inputProps}
      durationInFrames={inputProps.durationInFrames}
      fps={inputProps.fps}
      compositionWidth={1080}
      compositionHeight={1920}
      style={{ width: '100%', height: '100%' }}
      controls={false}
      loop
      playbackRate={1}
      autoPlay
    />
  );
}
