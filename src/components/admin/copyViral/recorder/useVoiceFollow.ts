'use client';

import { useEffect, useState } from 'react';
import { VoiceFollow } from './recorderCore';

export { followSupported as voiceFollowSupported } from './recorderCore';

/**
 * Words of `script` read so far while `active` (countdown or recording, with follow on), from Chrome's speech
 * recognition (VoiceFollow from the shared recorder core). `prime` loads the speech engine ahead of the first take:
 * pass true once the camera is open.
 */
export const useVoiceFollow = (script: string[], active: boolean, prime: boolean) => {
  const [read, setRead] = useState(0);
  const [voice] = useState(() => new VoiceFollow(setRead));

  useEffect(() => {
    if (prime) voice.prime();
  }, [voice, prime]);

  useEffect(() => {
    if (!active) return;
    voice.start(script);
    return () => voice.stop();
  }, [voice, script, active]);

  return active ? read : 0;
};
