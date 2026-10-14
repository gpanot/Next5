'use client';

import { CheckIcon } from './icons';

/** A builder step's heading: its number, or a check once it is done. */
export function StepTitle({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition ${done ? 'bg-emerald-400 text-zinc-950' : 'border border-white/20 text-white/60'}`}>
        {done ? <CheckIcon /> : n}
      </span>
      {title}
    </h4>
  );
}
