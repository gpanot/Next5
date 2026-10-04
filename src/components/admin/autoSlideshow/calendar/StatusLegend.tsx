'use client';

import { DOT } from './CanvasTile';
import { STATUS_LABELS, type TileStatus } from './tileModel';

/** Statuses the legend names. Kept, Making and Ready left out: the tiles and the day view already say it. */
const SHOWN: TileStatus[] = ['scheduled'];

/** What the tile dots mean. Waiting ideas are not on the calendar (they get a day when kept), so no idea dot. */
export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {(Object.keys(STATUS_LABELS) as Exclude<TileStatus, 'failed' | 'idea'>[]).filter((s) => SHOWN.includes(s)).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${s === 'ready' ? 'bg-zinc-900 dark:bg-white' : DOT[s]}`} />
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
