'use client';

import { useEffect, useState } from 'react';
import { Level } from './recorderCore';

export { levelLabel } from './recorderCore';

/** Microphone level 0..1 (RMS, eased), about 15 times a second. */
export const useAudioLevel = (stream: MediaStream | null) => {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const meter = new Level(setLevel);
    meter.attach(stream);
    return () => meter.detach();
  }, [stream]);

  return level;
};
