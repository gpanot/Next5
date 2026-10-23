'use client';

import { useEffect, useRef } from 'react';

/** Shown when the clipboard is blocked: the text, selected, ready for a manual copy. */
export const CopyFallback = ({ text, note }: { text: string; note: string }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p role="alert" className="text-[13px] text-app-danger">{note}</p>
      <textarea
        ref={ref}
        readOnly
        value={text}
        rows={8}
        onFocus={(e) => e.target.select()}
        className="w-full rounded-xl border border-app-line bg-app-panel p-3 text-[13px] text-app-ink"
      />
    </div>
  );
};
