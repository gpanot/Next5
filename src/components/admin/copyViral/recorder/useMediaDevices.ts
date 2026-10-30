'use client';

import { useEffect, useReducer, useState } from 'react';
import { Devices } from './recorderCore';

export type { DeviceOption, StreamInfo } from './recorderCore';

/**
 * Camera + microphone stream for the recorder (Devices from the shared recorder core). The picked devices are
 * remembered on this browser. The stream is rebuilt when a device or the framing changes and stopped on unmount.
 */
export const useMediaDevices = (wide: boolean) => {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [devices] = useState(() => new Devices(rerender, 'copyViral'));

  useEffect(() => {
    void devices.open(wide);
    return () => devices.close();
  }, [devices, wide]);

  return {
    cameras: devices.cameras, mics: devices.mics, cameraId: devices.cameraId, micId: devices.micId,
    setCameraId: (id: string) => void devices.setCamera(id, wide),
    setMicId: (id: string) => void devices.setMic(id, wide),
    stream: devices.stream, info: devices.info, error: devices.error,
  };
};
