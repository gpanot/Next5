'use client';

import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SegmentedControl } from '../../ui/SegmentedControl';

type CompareLightboxProps = { originalUrl: string | null; generatedUrl: string; title: string; onClose: () => void; panel?: ReactNode };

/** Side by side on desktop; a toggle between original and generated on phones. */
export const CompareLightbox = ({ originalUrl, generatedUrl, title, onClose, panel }: CompareLightboxProps) => {
  const [view, setView] = useState<'original' | 'generated'>('generated');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col bg-black/92 p-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"><X aria-hidden className="h-5 w-5" /></button>
      </div>
      <div className="mt-2 flex justify-center sm:hidden">
        <SegmentedControl options={[{ value: 'original', label: 'Original' }, { value: 'generated', label: 'Generated' }]} value={view} onChange={(v) => setView(v)} />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-4 py-4">
        {originalUrl && (
          <figure className={`h-full min-h-0 flex-1 flex-col items-center gap-2 ${view === 'original' ? 'flex' : 'hidden'} sm:flex`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={originalUrl} alt="Your product photo" className="min-h-0 max-w-full flex-1 rounded-xl object-contain" />
            <figcaption className="label-caps text-[10px] text-white/70">Your product</figcaption>
          </figure>
        )}
        <figure className={`h-full min-h-0 flex-1 flex-col items-center gap-2 ${view === 'generated' ? 'flex' : 'hidden'} sm:flex`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img src={generatedUrl} alt="Generated photo" className="min-h-0 max-w-full flex-1 rounded-xl object-contain" />
          <figcaption className="label-caps text-[10px] text-white/70">Next5</figcaption>
        </figure>
      </div>
      {panel && <div className="mx-auto w-full max-w-xl shrink-0">{panel}</div>}
    </div>,
    document.body,
  );
};
