'use client';

/**
 * Inner Remotion player component — only ever imported via the dynamic()
 * wrapper in PreviewPlayer.tsx (ssr: false), so Remotion's browser APIs
 * are never touched during SSR.
 */

import { Player, type PlayerRef } from '@remotion/player';
import { forwardRef } from 'react';
import { GreenScreenComposition } from '../../../../remotion/GreenScreenComposition';
import type { GreenScreenProps } from '../../../../remotion/types';

type Props = {
  inputProps: GreenScreenProps;
};

export const RemotionPlayerInner = forwardRef<PlayerRef, Props>(
  ({ inputProps }, ref) => {
    return (
      <Player
        ref={ref}
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
      />
    );
  },
);

RemotionPlayerInner.displayName = 'RemotionPlayerInner';
