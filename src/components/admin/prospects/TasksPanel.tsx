'use client';

import { useEffect } from 'react';
import { Check, Circle, Loader2, Minus, X } from 'lucide-react';
import type { ProspectPackDto, ProspectTask, ProspectTaskGroup, ProspectTaskState, ProspectTasksDto } from '../../../types/admin/prospects';
import { useAdminApi } from '../business/useAdminApi';
import { ErrorState } from '../../ui/ErrorState';
import { Sheet } from '../../ui/Sheet';
import { SkeletonText } from '../../ui/Skeleton';

/** How often the open panel reads the tasks again while the pack is being made. */
const POLL_MS = 5_000;

const working = (pack: ProspectPackDto) => pack.status === 'queued' || pack.status === 'building' || pack.status === 'making';

const STATE_ICON: Record<ProspectTaskState, { icon: React.ReactNode; tone: string; label: string }> = {
  done: { icon: <Check className="h-3.5 w-3.5" />, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', label: 'Done' },
  running: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', label: 'Running' },
  waiting: { icon: <Circle className="h-3 w-3" />, tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400', label: 'Waiting' },
  failed: { icon: <X className="h-3.5 w-3.5" />, tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', label: 'Failed' },
  skipped: { icon: <Minus className="h-3.5 w-3.5" />, tone: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500', label: 'Skipped' },
};

function TaskRow({ task }: { task: ProspectTask }) {
  const state = STATE_ICON[task.state];
  return (
    <li className="flex gap-3 px-3 py-2.5">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${state.tone}`} aria-label={state.label}>{state.icon}</span>
      <div className="min-w-0">
        <p className={`text-[13px] ${task.state === 'skipped' ? 'text-app-muted' : 'text-app-ink'}`}>{task.label}</p>
        {task.detail && <p className={`break-words text-[12px] ${task.state === 'failed' ? 'text-app-danger' : 'text-app-muted'}`}>{task.detail}</p>}
      </div>
    </li>
  );
}

/** A part of the pack: its tasks, with done / failed counts in the header. */
function GroupCard({ group }: { group: ProspectTaskGroup }) {
  const done = group.tasks.filter((t) => t.state === 'done').length;
  const failed = group.tasks.filter((t) => t.state === 'failed').length;
  return (
    <section className="rounded-xl border border-app-line">
      <h3 className="flex items-center justify-between gap-2 border-b border-app-line px-3 py-2 text-[13px] font-semibold text-app-ink">
        <span>{group.title}</span>
        <span className="text-[12px] font-normal tabular-nums text-app-muted">
          {done}/{group.tasks.length}
          {failed > 0 && <span className="ml-2 font-semibold text-app-danger">{failed} failed</span>}
        </span>
      </h3>
      <ul className="divide-y divide-app-line">{group.tasks.map((t, i) => <TaskRow key={`${t.label}|${i}`} task={t} />)}</ul>
    </section>
  );
}

type Props = { token: string; pack: ProspectPackDto; onClose: () => void };

/** Right panel: every task of the pack and how far it is, read again every few seconds while the pack is being made. */
export function TasksPanel({ token, pack, onClose }: Props) {
  const { data, error, loading, refresh } = useAdminApi<{ tasks: ProspectTasksDto }>(token, `/api/admin/prospects/${pack.id}/tasks`);
  const live = working(pack);
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [live, refresh]);
  return (
    <Sheet open side="right" onClose={onClose} title={pack.name}>
      <div className="space-y-3">
        <p className="text-[12px] text-app-muted">{live ? 'Updates every few seconds while the pack is made.' : 'Where each part ended.'}</p>
        {error && <ErrorState message={error} onRetry={refresh} />}
        {loading && !data && <SkeletonText lines={8} />}
        {data?.tasks.groups.map((g) => <GroupCard key={g.title} group={g} />)}
      </div>
    </Sheet>
  );
}
