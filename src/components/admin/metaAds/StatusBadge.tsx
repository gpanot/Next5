import type { MetaAdRunStatus } from '../../../types/admin/metaAds';

export function StatusBadge({ status }: { status: MetaAdRunStatus }) {
  if (status === 'COMPLETED') {
    return <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300">Ready</span>;
  }
  if (status === 'FAILED') {
    return <span className="shrink-0 rounded-md bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700 uppercase dark:bg-red-950 dark:text-red-300">Failed</span>;
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 uppercase dark:bg-blue-950 dark:text-blue-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
      Step {status.charAt(5)}
    </span>
  );
}
