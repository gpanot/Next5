'use client';

import { useEffect, useState } from 'react';

/** Shows one line at a time, fading to the next every `everyMs`, so a long wait never looks frozen. */
export function RotatingLine({ lines, everyMs = 4_000 }: { lines: string[]; everyMs?: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const id = setInterval(() => setIndex((i) => i + 1), everyMs);
    return () => clearInterval(id);
  }, [lines.length, everyMs]);
  if (lines.length === 0) return null;
  const line = lines[index % lines.length]!;
  return (
    <p className="flex min-h-5 items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300" aria-live="off">
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-blue-500" aria-hidden />
      <span key={line} className="animate-[fade-in_0.5s_ease-out]">{line}</span>
    </p>
  );
}
