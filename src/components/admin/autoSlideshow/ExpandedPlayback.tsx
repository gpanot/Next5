'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

/** Phones and tablets show the playing slideshow full screen; desktop doubles the cover in its grid instead. */
export const wantsFullscreen = () => window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

const fullscreenElement = () => {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

const enterFullscreen = (el: FullscreenElement) => {
  const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  // iPhone Safari has no element full screen: the layer already fills the screen there.
  void Promise.resolve(request?.()).catch(() => undefined);
};

const exitFullscreen = () => {
  const doc = document as FullscreenDocument;
  if (!fullscreenElement()) return;
  const exit = doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
  void Promise.resolve(exit?.()).catch(() => undefined);
};

/** Full screen on phones, leaving it (system gesture) closes the layer; Escape closes it; the page stops scrolling. */
const useExpandedLayer = (layer: RefObject<HTMLDivElement | null>, onClose: () => void) => {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const el = layer.current;
    if (el) enterFullscreen(el);
    let wasFullscreen = false;
    const onChange = () => {
      if (fullscreenElement()) wasFullscreen = true;
      else if (wasFullscreen) close.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
      exitFullscreen();
    };
  }, [layer]);
};

export function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {expanded ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}

type Props = {
  count: number;
  index: number;
  renderFrame: (i: number) => ReactNode;
  /** The sound, play and collapse buttons, drawn on the slide's corner. */
  controls: ReactNode;
  onClose: () => void;
};

/**
 * The playing slideshow full screen, on phones and tablets. Marked as cover controls, so a tap on it does not stop
 * the playback.
 */
export function ExpandedPlayback({ count, index, renderFrame, controls, onClose }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  useExpandedLayer(layer, onClose);
  return createPortal(
    <div ref={layer} data-cover-controls className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="relative aspect-[9/16] max-h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden sm:rounded-xl">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-300 ${i === index ? 'opacity-100' : 'opacity-0'}`}>{renderFrame(i)}</div>
        ))}
        <div className="absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2">{controls}</div>
      </div>
    </div>,
    document.body,
  );
}
