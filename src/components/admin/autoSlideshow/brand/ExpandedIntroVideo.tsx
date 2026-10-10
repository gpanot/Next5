'use client';

import { X } from 'lucide-react';
import type { CSSProperties, RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistoryBack } from '../../../../hooks/useHistoryBack';
import { useLockBodyScroll } from '../../../../hooks/useLockBodyScroll';

type Box = { top: number; left: number; width: number; height: number; radius: number };
type Phase = 'start' | 'open' | 'closing';

const DURATION_MS = 320;
const MOBILE_MAX = 640;

const boxOfRect = (r: DOMRect): Box => ({ top: r.top, left: r.left, width: r.width, height: r.height, radius: 12 });

/** Where the video ends up: full screen on phones, a big centered 9:16 card on wider screens. */
const targetBox = (): Box => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < MOBILE_MAX) return { top: 0, left: 0, width: vw, height: vh, radius: 0 };
  const height = Math.min(vh * 0.88, ((vw * 0.9) * 16) / 9);
  const width = (height * 9) / 16;
  return { top: (vh - height) / 2, left: (vw - width) / 2, width, height, radius: 16 };
};

const boxStyle = (b: Box): CSSProperties => ({ top: b.top, left: b.left, width: b.width, height: b.height, borderRadius: b.radius });

type Props = {
  src: string;
  poster: string;
  label: string;
  /** The photo the video grows out of and shrinks back into, and where it was when tapped. */
  sourceRef: RefObject<HTMLElement | null>;
  sourceRect: DOMRect;
  onClosed: () => void;
};

/** The intro video lifted out of its photo: it grows to a big player, plays, and shrinks back on close. */
export function ExpandedIntroVideo({ src, poster, label, sourceRef, sourceRect, onClosed }: Props) {
  const [phase, setPhase] = useState<Phase>('start');
  const [box, setBox] = useState<Box>(() => boxOfRect(sourceRect));
  const videoRef = useRef<HTMLVideoElement>(null);

  useLockBodyScroll(true);

  // Grow from the photo on the frame after mount, so the browser sees the start box first.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      setBox(targetBox());
      setPhase('open');
    }));
    return () => cancelAnimationFrame(id);
  }, []);

  const closingRef = useRef(false);
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    videoRef.current?.pause();
    setPhase('closing');
    const el = sourceRef.current;
    if (el) setBox(boxOfRect(el.getBoundingClientRect()));
    window.setTimeout(onClosed, DURATION_MS);
  }, [onClosed, sourceRef]);

  useHistoryBack(true, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onResize = () => setBox(targetBox());
    window.addEventListener('keydown', onKey);
    if (phase === 'open') window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [close, phase]);

  const open = phase === 'open';
  // Full screen (phones): the whole video shows, black bars if its shape differs from the screen's.
  const fullScreen = open && box.radius === 0;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[100]">
      <button type="button" aria-label="Close video" onClick={close} className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div className="fixed overflow-hidden bg-black shadow-2xl transition-all duration-300 ease-out" style={boxStyle(box)}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          playsInline
          controls={open}
          onEnded={close}
          className={`h-full w-full ${fullScreen ? 'object-contain' : 'object-cover'}`}
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close video"
          className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 active:scale-90 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
