'use client';

import { useEffect, useState } from 'react';

type Props = {
  /** The slide's number as shown on its card (1-based). */
  number: number;
  onDelete: () => void;
  disabled?: boolean;
  /** Why it is disabled (the tooltip). */
  reason?: string;
  working?: boolean;
};

/** Seconds the armed "Delete?" waits for its second tap before going back to the bin. */
const ARMED_MS = 4_000;

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

/**
 * The bin under a content slide's picture, in the Brand Cast and Hooks Volume strips. Deleting takes two confirmations:
 * the first tap arms it ("Delete?"), the second asks once more in a dialog.
 */
export function SlideDeleteButton({ number, onDelete, disabled = false, reason, working = false }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const tap = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    if (window.confirm(`Delete slide ${number}? This cannot be undone.`)) onDelete();
  };

  if (working) {
    return (
      <span className="flex h-9 w-9 items-center justify-center" aria-label={`Deleting slide ${number}`}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={tap}
      onBlur={() => setArmed(false)}
      disabled={disabled}
      aria-label={armed ? `Tap again to delete slide ${number}` : `Delete slide ${number}`}
      title={disabled ? reason : armed ? 'Tap again to delete' : `Delete slide ${number}`}
      className={`flex h-9 items-center justify-center gap-1 rounded-full transition active:scale-95 disabled:opacity-30 ${
        armed ? 'bg-red-500 px-3 text-xs font-semibold text-white' : 'w-9 text-white/60 hover:bg-red-500/15 hover:text-red-300'
      }`}
    >
      <TrashIcon />
      {armed && 'Delete?'}
    </button>
  );
}
