/**
 * A still photo that moves: slow zoom/pan toward the slide camera's focus point. No depth: the Ideas deck cards play
 * the same move with the same math (slideCamera.ts), so a card looks like its render.
 */

import { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { cameraOrigin, cameraTransform } from './slideCamera';
import type { SlideCamera } from './types';

/**
 * Holds the frame until the photo is decoded. Plain Image() loads, like BackgroundImg, to avoid img.decode() CORS
 * issues on R2 URLs.
 */
function useDecoded(src: string): boolean {
  const [handle] = useState(() => delayRender('Loading camera still'));
  const released = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const release = () => {
      if (released.current) return;
      released.current = true;
      continueRender(handle);
    };
    let live = true;
    const img = new Image();
    img.onload = img.onerror = () => {
      if (!live) return;
      setReady(true);
      // One paint with the image in place before the frame is captured.
      requestAnimationFrame(release);
    };
    img.src = src;
    return () => { live = false; release(); };
  }, [src, handle]);
  return ready;
}

type Props = {
  src: string;
  camera: SlideCamera;
  /** Slide length: the move spans the whole slide. */
  durationInFrames: number;
};

export function CameraStill({ src, camera, durationInFrames }: Props) {
  const frame = useCurrentFrame();
  const ready = useDecoded(src);
  if (!ready) return null;
  const t = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: cameraOrigin(camera), transform: cameraTransform(camera, t) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
