'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CopyViralShot } from '../../../types/admin/copyViral';

/** Shot transcripts joined into reading paragraphs: one per picture scene. */
const toParagraphs = (shots: CopyViralShot[]): string[] => {
  const groups = new Map<number, string[]>();
  for (const s of shots) {
    const text = s.transcript?.trim();
    if (text) groups.set(s.sequence, [...(groups.get(s.sequence) ?? []), text]);
  }
  return [...groups.values()].map((parts) => parts.join(' '));
};

function TranscriptModal({ paragraphs, onClose }: { paragraphs: string[]; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Transcript"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border border-app-line bg-app-panel shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
          <h3 className="text-sm font-extrabold text-app-ink">Transcript</h3>
          <button type="button" onClick={onClose} className="min-h-8 rounded-lg px-2 text-sm font-semibold text-app-muted transition hover:text-app-ink">Close</button>
        </div>
        <div className="space-y-3 overflow-y-auto p-4 text-sm leading-relaxed text-app-ink">
          {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p className="text-app-muted">No transcript yet.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** "Transcript" button that opens a plain reading popup of what the reel says. */
export function TranscriptButton({ shots }: { shots: CopyViralShot[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-10 w-full rounded-xl border border-app-line px-3 text-sm font-semibold text-app-ink transition hover:bg-app-sunken"
      >
        Transcript
      </button>
      {open && <TranscriptModal paragraphs={toParagraphs(shots)} onClose={() => setOpen(false)} />}
    </>
  );
}
