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
import { GreenScreenComposition } from '../../../remotion/GreenScreenComposition';
import type { GreenScreenProps } from '../../../remotion/types';

type Props = {
  inputProps: GreenScreenProps;
  /** Increment to seek to frame 0 and play from start. */
  playFromStartSignal: number;
  /** Increment to pause the player (e.g. when a modal opens). */
  pauseSignal: number;
};

export function RemotionPlayerInner({ inputProps, playFromStartSignal, pauseSignal }: Props) {
  const playerRef = useRef<PlayerRef>(null);

  // Suppress the "play() interrupted by pause()" AbortError that Chrome fires
  // when the Remotion Player re-renders (prop changes) while a video is
  // mid-play. The error is completely benign — the video simply paused —
  // but Next.js dev mode surfaces it as an unhandled rejection in the console.
  useEffect(() => {
    const suppress = (e: PromiseRejectionEvent) => {
      if (e.reason?.name === 'AbortError') e.preventDefault();
    };
    window.addEventListener('unhandledrejection', suppress);
    return () => window.removeEventListener('unhandledrejection', suppress);
  }, []);

  // When playFromStartSignal changes, seek to 0 and play.
  useEffect(() => {
    if (playFromStartSignal <= 0) return;
    playerRef.current?.seekTo(0);
    // play() internally calls videoEl.play() which returns a Promise.
    // Catch AbortError in case a re-render pauses it before it starts.
    try {
      playerRef.current?.play();
    } catch {
      // AbortError — safe to ignore
    }
  }, [playFromStartSignal]);

  // When pauseSignal changes, pause the player.
  useEffect(() => {
    if (pauseSignal <= 0) return;
    playerRef.current?.pause();
  }, [pauseSignal]);

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
      // Acknowledge the Remotion license requirement (internal tool / dev use).
      // See https://remotion.dev/license — add a paid license if shipping commercially.
      acknowledgeRemotionLicense
      // Suppress unhandled rejections from media that hasn't been uploaded to R2 yet.
      errorFallback={() => (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: 13,
            textAlign: 'center',
            padding: 16,
          }}
        >
          Assets not found — upload files to R2 first.
        </div>
      )}
    />
  );
}
