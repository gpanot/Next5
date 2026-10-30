// Types for recorderCore.js (plain JS so the studio skill can load it without a build step).

export type DeviceOption = { id: string; label: string };

/** What the camera really sends, for the "1080p · 30 fps" badge. */
export type StreamInfo = { width: number; height: number; fps: number };

export type RecorderState = 'idle' | 'countdown' | 'recording' | 'review';

export type Take = { file: File; url: string };

export const store: {
  get: (key: string, fallback: unknown) => unknown;
  set: (key: string, value: unknown) => void;
};

export const pickMimeType: () => string;

export class Devices {
  constructor(onChange: () => void, keyPrefix?: string);
  stream: MediaStream | null;
  info: StreamInfo | null;
  error: string | null;
  cameras: DeviceOption[];
  mics: DeviceOption[];
  cameraId: string;
  micId: string;
  open(wide: boolean): Promise<void>;
  setCamera(id: string, wide: boolean): Promise<void>;
  setMic(id: string, wide: boolean): Promise<void>;
  close(): void;
}

export class Level {
  constructor(onLevel: (level: number) => void);
  attach(stream: MediaStream | null): void;
  detach(): void;
}
export const levelLabel: (level: number) => string;

export class Recorder {
  constructor(onChange: (why?: 'tick') => void);
  state: RecorderState;
  count: number;
  elapsedMs: number;
  take: Take | null;
  readonly busy: boolean;
  start(stream: MediaStream | null): void;
  stop(): void;
  discard(): void;
  warm(stream: MediaStream | null): void;
  dispose(): void;
}

export const normWord: (word: string) => string;
export const followPointer: (script: string[], heard: string[]) => number;
export const followSupported: () => boolean;

export class VoiceFollow {
  constructor(onRead: (read: number) => void);
  start(script: string[], lang?: string): void;
  stop(): void;
  prime(lang?: string): void;
}
