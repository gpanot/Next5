'use client';

import { DOT } from './CanvasTile';
import { STATUS_LABELS, type TileStatus } from './tileModel';

/** What the tile dots mean. The idea dot is drawn dashed, like an idea's tile. */
export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {(Object.keys(STATUS_LABELS) as Exclude<TileStatus, 'failed'>[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={s === 'idea' ? 'h-3 w-3 rounded-[3px] border-[1.5px] border-dashed border-blue-600' : `h-2.5 w-2.5 rounded-full ${s === 'ready' ? 'bg-zinc-900 dark:bg-white' : DOT[s]}`} />
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
