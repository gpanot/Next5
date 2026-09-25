'use client';

import { useEffect } from 'react';
import type { UgcCharacterDto } from '../../../types/admin/ugc';
import { PortraitJsonPanel } from './PortraitJsonPanel';
import { SecondaryButton } from './ui';

type PortraitJsonDialogProps = {
  character: UgcCharacterDto;
  busy: boolean;
  error: string;
  onGenerate: () => void;
  onClose: () => void;
};

/** One character's Portrait Clone JSON. Bottom sheet on phones, centered dialog on desktop. */
export function PortraitJsonDialog({ character, busy, error, onGenerate, onClose }: PortraitJsonDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Character JSON"
        className="flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-sm sm:max-w-xl sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
            <img src={character.url} alt="" className="h-14 w-8 shrink-0 rounded-md object-cover ring-1 ring-line" />
            <h3 className="truncate text-[15px] font-semibold text-ink">Character JSON</h3>
          </div>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
        <PortraitJsonPanel character={character} busy={busy} error={error} onGenerate={onGenerate} />
      </div>
    </div>
  );
}
