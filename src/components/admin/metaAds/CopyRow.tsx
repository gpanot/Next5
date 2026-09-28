'use client';

import { useState } from 'react';

type Props = { index: number; text: string; limit: number; primary: boolean };

export function CopyRow({ index, text, limit, primary }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition dark:bg-zinc-900',
        primary ? 'border-blue-100 ring-1 ring-blue-50 dark:border-blue-900 dark:ring-blue-950' : 'border-line dark:border-zinc-800',
      ].join(' ')}
    >
      <span className={['w-4 text-center text-xs font-medium', primary ? 'text-blue-600' : 'text-zinc-400'].join(' ')}>{index}</span>
      <p className="flex-1 text-xs leading-relaxed text-ink dark:text-zinc-100">{text}</p>
      <span className={['text-[10px]', text.length > limit ? 'text-red-500' : 'text-zinc-400'].join(' ')}>{text.length}</span>
      <button onClick={() => void copy()} className="min-h-9 rounded border border-line px-3 text-[11px] font-medium text-muted transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
