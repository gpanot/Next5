'use client';

import { useCallback, useEffect, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/** Copies text. Never claims success when the clipboard is blocked: 'failed' tells the page to show a select-and-copy box. */
export const useCopy = () => {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state !== 'copied') return;
    const id = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(id);
  }, [state]);

  const copy = useCallback(async (text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }, []);

  return { state, copy, reset: () => setState('idle') };
};
