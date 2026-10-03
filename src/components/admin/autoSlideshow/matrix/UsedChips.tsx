'use client';

import type { BankUseDto } from '../../../../types/admin/slideshowBank';
import type { OpenUse } from './matrixUse';

type Props = { uses: BankUseDto[]; runId: string; onOpen: OpenUse };

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const POST_TAG: Record<'scheduled' | 'posted', string> = { scheduled: 'Sched.', posted: 'Posted' };

/** One chip per slideshow that used a bank part: "#4 · Posted" for this run (tap to open), "Oct 2" for older runs. */
export function UsedChips({ uses, runId, onOpen }: Props) {
  if (uses.length === 0) return <span className="text-xs text-muted">Not used yet</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {uses.map((u) => {
        const here = u.runId === runId;
        const label = `${here ? `#${u.position + 1}` : day(u.createdAt)}${u.post ? ` · ${POST_TAG[u.post]}` : ''}`;
        return (
          <button
            key={u.slideshowId}
            onClick={() => onOpen(u)}
            disabled={!here || u.status !== 'ready'}
            title={here ? `Slideshow ${u.position + 1} of this run` : `Made ${day(u.createdAt)} in another run`}
            className={`min-h-7 rounded-full px-2.5 text-xs font-semibold tabular-nums transition active:scale-95 disabled:active:scale-100 ${here ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
          >
            {label}
          </button>
        );
      })}
    </span>
  );
}
