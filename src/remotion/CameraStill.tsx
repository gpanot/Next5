/**
 * A still photo that moves: slow zoom/pan toward the slide camera's focus point, plus 2.5D depth parallax when the
 * worker made displacement maps for it. Without maps it falls back to the zoom/pan alone.
 *
 * Parallax: feDisplacementMap samples P'(x,y) = P(x + k·(R-0.5), y + k·(G-0.5)), and k is animated over the slide.
 * With the radial map that is a depth-weighted zoom (near things grow faster: a dolly); with the truck map near
 * pixels slide against far ones (a sideways move).
 */

import { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, Easing, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import { CAMERA_OVERSCAN, cameraAt, cameraOrigin, depthAmount } from './slideCamera';
import type { SlideCamera, SlideDepth } from './types';

const SHOT_EASE = Easing.bezier(0.33, 0, 0.67, 1);

/**
 * Holds the frame until the photo and its map are decoded, so the SVG filter has both inputs on the first frame.
 * Plain Image() loads, like BackgroundImg, to avoid img.decode() CORS issues on R2 URLs.
 */
function useDecoded(src: string, mapUrl: string | null): boolean {
  const [handle] = useState(() => delayRender('Loading camera still'));
  const released = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const release = () => {
      if (released.current) return;
      released.current = true;
      continueRender(handle);
    };
    const load = (url: string) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
    let live = true;
    void Promise.all([src, ...(mapUrl ? [mapUrl] : [])].map(load)).then(() => {
      if (!live) return;
      setReady(true);
      // One paint with the images in place before the frame is captured.
      requestAnimationFrame(release);
    });
    return () => { live = false; release(); };
  }, [src, mapUrl, handle]);
  return ready;
}

type Props = {
  src: string;
  camera: SlideCamera;
  depth?: SlideDepth;
  /** Slide length: the move spans the whole slide. */
  durationInFrames: number;
  /** Unique per slide: the SVG filter is referenced by id. */
  filterId: string;
};

export function CameraStill({ src, camera, depth, durationInFrames, filterId }: Props) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const mapUrl = depth ? (camera.move.startsWith('drift') ? depth.truckUrl : depth.radialUrl) : null;
  const ready = useDecoded(src, mapUrl);
  const p = SHOT_EASE(Math.min(1, frame / Math.max(1, durationInFrames - 1)));
  const { scale, k, panX } = cameraAt(camera, p, depth ? depthAmount(camera, depth.spread) : 0);
  if (!ready) return null;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: cameraOrigin(camera), transform: `translateX(${panX}px) scale(${CAMERA_OVERSCAN * scale})` }}>
        {mapUrl ? (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <filter id={filterId} filterUnits="userSpaceOnUse" x={0} y={0} width={width} height={height} colorInterpolationFilters="sRGB">
                <feImage href={mapUrl} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" result="map" />
                <feDisplacementMap in="SourceGraphic" in2="map" scale={k} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <image href={src} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" filter={`url(#${filterId})`} />
          </svg>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
