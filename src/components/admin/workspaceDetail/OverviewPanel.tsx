'use client';

import type { WorkspaceDetailDto } from '../../../types/admin/workspaceDetail';
import { PanelEmpty, Section } from './PanelStates';

const day = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="block text-xl font-extrabold tabular-nums text-ink dark:text-zinc-100">{value}</span>
      <span className="block text-xs text-muted">{label}</span>
    </div>
  );
}

const statusClass = (status: string) =>
  status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  : status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

/** Counts and runs; tapping a run opens it in the user's own view. */
export function OverviewPanel({ detail, onOpenRun }: { detail: WorkspaceDetailDto; onOpenRun: (runId: string) => void }) {
  const { counts, runs } = detail;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat value={runs.length} label="runs" />
        <Stat value={counts.slideshows} label="slideshows" />
        <Stat value={counts.posts} label="posts" />
        <Stat value={counts.blitzVideos} label="Blitz videos" />
        <Stat value={counts.blitzCards} label="Blitz cards" />
      </div>
      <Section title="Runs" meta="tap to open as the user">
        {runs.length === 0 ? (
          <PanelEmpty>No runs yet.</PanelEmpty>
        ) : (
          <ul className="divide-y divide-line dark:divide-zinc-800">
            {runs.map((r) => (
              <li key={r.id}>
                <button onClick={() => onOpenRun(r.id)} className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="min-w-0 flex-1 truncate font-medium text-ink dark:text-zinc-100">{r.url}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(r.status)}`}>{r.status.replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="text-xs tabular-nums text-muted">{r.slideshows}/{r.count} slideshows</span>
                  <span className="text-xs text-muted">{day(r.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
