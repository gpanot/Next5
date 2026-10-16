'use client';

import { useEffect, useRef, useState } from 'react';
import { APP_SCREEN_SIZE, type AppShotPose } from '../../../../../config/appShotPoses';
import { quadTransform } from './screenWarp';

/** The pose files' width in pixels (the quad's space: the 1440x2560 photo). */
const POSE_WIDTH = 1440;

/**
 * The app screenshot on a pose thumb's green screen: warped onto the screen's corners and clipped by its mask, black
 * past the screenshot's edges, as the built image does. Fills the nearest positioned parent (a 9:16 thumb).
 */
export function PoseScreenPreview({ pose, src }: { pose: AppShotPose; src: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / POSE_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A phone-shaped box (as the server fits the screenshot), which the warp then tilts onto the screen.
  const width = APP_SCREEN_SIZE.width * scale;
  const height = APP_SCREEN_SIZE.height * scale;
  const mask = `url(${pose.screen})`;

  return (
    <div
      ref={frame}
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-black"
      // Unprefixed only: the mask is white on black (luminance), which -webkit-mask would read as fully opaque.
      style={{ maskImage: mask, maskSize: '100% 100%', maskMode: 'luminance' }}
    >
      {scale > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute top-0 left-0 max-w-none object-cover"
          style={{ width, height, transformOrigin: '0 0', transform: quadTransform(pose.quad, width, height, scale) }}
        />
      )}
    </div>
  );
}
