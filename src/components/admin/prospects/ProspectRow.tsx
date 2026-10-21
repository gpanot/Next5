'use client';

import { useState } from 'react';
import { PROSPECT_BLITZ, PROSPECT_CAST, PROSPECT_HOOKS, prospectDm, prospectPath, type ProspectPackDto, type ProspectStatus } from '../../../types/admin/prospects';
import { CastPanel } from '../workspaceDetail/CastPanel';
import { CostDialog } from './CostDialog';
import { TasksPanel } from './TasksPanel';
import { formatDuration, makeSec } from './timing';

const STATUS: Record<ProspectStatus, { label: string; tone: string }> = {
  queued: { label: 'Waiting', tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
  building: { label: 'Reading site', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  faces: { label: 'Check faces', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  making: { label: 'Making posts', tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  ready: { label: 'Ready to send', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  failed: { label: 'Failed', tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  claimed: { label: 'Claimed', tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
};

const button =
  'min-h-11 rounded-xl border border-app-line px-4 text-[13px] font-semibold text-app-ink transition hover:bg-zinc-50 active:scale-95 disabled:opacity-50 dark:hover:bg-zinc-800';

type Props = { token: string; pack: ProspectPackDto; hideCost?: boolean; onApprove: (id: string) => Promise<void>; onDelete: (id: string) => Promise<void> };

/** Copies `text`; shows "Copied" on the button for a moment. */
function CopyButton({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  const copy = () => void navigator.clipboard.writeText(text).then(() => {
    setDone(true);
    window.setTimeout(() => setDone(false), 1_500);
  });
  return <button type="button" onClick={copy} className={button}>{done ? 'Copied' : label}</button>;
}

/** What each part has made, against the pack's mix, then the cost (tap for the detail) and the make time. */
function Progress({ token, pack, hideCost }: { token: string; pack: ProspectPackDto; hideCost?: boolean }) {
  const [costsOpen, setCostsOpen] = useState(false);
  const { blitz, cast, hooks } = pack.progress;
  const sec = makeSec(pack);
  const { siteSec, postsSec } = pack.timing;
  return (
    <p className="text-[12px] tabular-nums text-app-muted">
      {blitz}/{PROSPECT_BLITZ} videos · {cast}/{PROSPECT_CAST} Brand Cast · {hooks}/{PROSPECT_HOOKS} Hooks Volume
      {!hideCost && <>{' · '}<button type="button" onClick={() => setCostsOpen(true)} className="-my-2 rounded-md px-1 py-2 font-semibold text-app-ink underline decoration-dotted underline-offset-2 transition hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800">
        ${pack.costUsd.toFixed(2)}
      </button></>}
      {sec !== null && (
        <span title={`Site + faces ${formatDuration(siteSec ?? 0)} · posts ${formatDuration(postsSec ?? 0)} (face check wait not counted)`}> · {formatDuration(sec)}</span>
      )}
      {costsOpen && <CostDialog token={token} pack={pack} onClose={() => setCostsOpen(false)} />}
    </p>
  );
}

/** The face check: the cast as the user sees it (swap a face, retry), then "Approve faces". */
function FaceCheck({ token, pack, onApprove }: Omit<Props, 'onDelete'>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approve = async () => {
    setBusy(true);
    setError(null);
    await onApprove(pack.id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not approve.'));
    setBusy(false);
  };
  return (
    <div className="space-y-3 rounded-xl border border-app-line p-3">
      <CastPanel token={token} workspaceId={pack.workspaceId} />
      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
      <button type="button" onClick={() => void approve()} disabled={busy} className="min-h-11 w-full rounded-xl bg-app-ink px-4 text-[14px] font-semibold text-app-bg shadow-sm transition active:scale-95 disabled:opacity-50 sm:w-auto">
        {busy ? 'Starting…' : 'Faces look good: make the posts'}
      </button>
    </div>
  );
}

/** "See progress" (or what failed): opens the tasks panel. */
function TasksButton({ token, pack }: { token: string; pack: ProspectPackDto }) {
  const [open, setOpen] = useState(false);
  const busy = pack.status === 'queued' || pack.status === 'building' || pack.status === 'making';
  const label = pack.status === 'failed' ? 'See what failed' : busy ? 'See progress' : 'Details';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${button} ${pack.status === 'failed' ? 'text-app-danger' : ''}`}>{label}</button>
      {open && <TasksPanel token={token} pack={pack} onClose={() => setOpen(false)} />}
    </>
  );
}

/** One prospect: status, progress and cost, then what the admin can do at this point. */
export function ProspectRow({ token, pack, hideCost, onApprove, onDelete }: Props) {
  const status = STATUS[pack.status];
  const link = typeof window === 'undefined' ? prospectPath(pack.shareToken) : `${window.location.origin}${prospectPath(pack.shareToken)}`;
  const remove = () => {
    if (window.confirm(`Delete the pack for ${pack.name}? The link stops working and its workspace goes to the trash.`)) void onDelete(pack.id);
  };
  return (
    <li className="space-y-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <a href={`/admin/workspaces/${pack.workspaceId}`} target="_blank" rel="noopener noreferrer" className="block truncate text-[15px] font-semibold text-app-ink hover:underline">{pack.name} ↗</a>
          <p className="truncate text-[12px] text-app-muted">{pack.websiteUrl} · {pack.createdAt.slice(0, 10)}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold uppercase ${status.tone}`}>{status.label}</span>
      </div>
      <Progress token={token} pack={pack} hideCost={hideCost} />
      {pack.error && <p className="text-[12px] text-app-danger">{pack.error}</p>}
      {pack.status === 'faces' && <FaceCheck token={token} pack={pack} onApprove={onApprove} />}
      <div className="flex flex-wrap gap-2">
        <TasksButton token={token} pack={pack} />
        {(pack.status === 'ready' || pack.status === 'claimed') && (
          <>
            <a href={link} target="_blank" rel="noopener noreferrer" className={`${button} inline-flex items-center`}>Open link ↗</a>
            <CopyButton label="Copy link" text={link} />
            <CopyButton label="Copy DM" text={prospectDm(pack.name, link)} />
          </>
        )}
        {pack.status !== 'claimed' && <button type="button" onClick={remove} className={`${button} text-app-danger`}>Delete</button>}
      </div>
    </li>
  );
}
