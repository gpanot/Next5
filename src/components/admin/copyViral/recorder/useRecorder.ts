'use client';

import { useEffect, useReducer, useState } from 'react';
import { Recorder } from './recorderCore';

export type { RecorderState } from './recorderCore';

/**
 * Record → countdown 3 s → recording (with elapsed time) → review (a playable file) → keep or retake (Recorder from
 * the shared recorder core). The encoder is warmed up each time the stream opens, so the first take doesn't freeze.
 */
export const useRecorder = (stream: MediaStream | null) => {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [rec] = useState(() => new Recorder(rerender));

  useEffect(() => rec.warm(stream), [rec, stream]);
  useEffect(() => () => rec.dispose(), [rec]);

  return {
    state: rec.state, count: rec.count, elapsedMs: rec.elapsedMs, take: rec.take,
    start: () => rec.start(stream), stop: () => rec.stop(), discard: () => rec.discard(),
  };
};
