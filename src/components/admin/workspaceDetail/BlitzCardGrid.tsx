'use client';

import type { BlitzCardCell, BlitzCardMatrixDto } from '../../../types/admin/workspaceDetail';
import { PanelEmpty } from './PanelStates';

/** Statuses worth a number in a cell, in deck order; the rest only count toward the total. */
const SHOWN: { status: string; label: string; className: string }[] = [
  { status: 'kept', label: 'kept', className: 'text-emerald-700 dark:text-emerald-400' },
  { status: 'rendered', label: 'rendered', className: 'text-blue-700 dark:text-blue-400' },
  { status: 'discarded', label: 'discarded', className: 'text-red-700 dark:text-red-400' },
];

function Cell({ cell }: { cell: BlitzCardCell | undefined }) {
  if (!cell) return <span className="text-muted">·</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-base font-extrabold tabular-nums text-ink dark:text-zinc-100">{cell.total}</span>
      {SHOWN.filter((s) => cell.byStatus[s.status]).map((s) => (
        <span key={s.status} className={`text-[11px] tabular-nums ${s.className}`}>{cell.byStatus[s.status]} {s.label}</span>
      ))}
    </span>
  );
}

/** The workspace's Blitz deck cards: one row per archetype, one column per lens, counted by what the user did. */
export function BlitzCardGrid({ matrix }: { matrix: BlitzCardMatrixDto }) {
  if (matrix.total === 0) return <PanelEmpty>No Blitz cards yet. They appear once the user opens Content › Blitz Slide.</PanelEmpty>;
  const cellOf = (lens: string, archetype: string) => matrix.cells.find((c) => c.lens === lens && c.archetype === archetype);
  return (
    <div className="overflow-x-auto rounded-xl border border-line dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-[11px] uppercase tracking-wider text-muted dark:bg-zinc-950">
          <tr>
            <th className="sticky left-0 bg-zinc-50 px-3 py-2 font-medium dark:bg-zinc-950">Archetype \ Lens</th>
            {matrix.lenses.map((l) => <th key={l} className="min-w-28 px-3 py-2 font-medium">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.archetypes.map((a) => (
            <tr key={a} className="border-t border-line dark:border-zinc-800">
              <th className="sticky left-0 max-w-48 bg-white px-3 py-2 text-xs font-semibold text-ink dark:bg-zinc-900 dark:text-zinc-100">{a}</th>
              {matrix.lenses.map((l) => <td key={l} className="px-3 py-2 align-top"><Cell cell={cellOf(l, a)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
