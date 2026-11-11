'use client';

import { Minimize2 } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Full-screen pop-up showing a photo big. Closes on Escape, backdrop tap, or the collapse button. */
export function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-xl object-contain shadow-sm" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close big photo"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 active:scale-90"
      >
        <Minimize2 aria-hidden className="h-5 w-5" />
      </button>
    </div>,
    document.body,
  );
}
