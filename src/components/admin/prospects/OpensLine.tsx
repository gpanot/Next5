'use client';

import { useState } from 'react';
import type { ProspectOpen, ProspectPackDto } from '../../../types/admin/prospects';

const when = (iso: string): string => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const openDetail = (open: ProspectOpen): string => [when(open.at), open.device, open.country].filter(Boolean).join(' · ');

const isLive = (pack: ProspectPackDto): boolean => pack.status === 'ready' || pack.status === 'claimed';

/** Whether the lead opened the link: how many times, the last time, and (tap) each time. */
export function OpensLine({ pack }: { pack: ProspectPackDto }) {
  const [open, setOpen] = useState(false);
  const { count, latest } = pack.opens;
  if (count === 0) return isLive(pack) ? <p className="text-[12px] text-app-muted">Link not opened yet</p> : null;
  return (
    <div className="text-[12px] tabular-nums">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="-mx-1 rounded-md px-1 py-1 font-semibold text-emerald-700 underline decoration-dotted underline-offset-2 transition hover:bg-zinc-100 active:scale-95 dark:text-emerald-300 dark:hover:bg-zinc-800">
        Opened {count} {count === 1 ? 'time' : 'times'} · last {when(latest[0].at)}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 text-app-muted">
          {latest.map((o) => <li key={o.at}>{openDetail(o)}</li>)}
          {count > latest.length && <li>and {count - latest.length} earlier</li>}
        </ul>
      )}
    </div>
  );
}

/** The share of live links that were opened, over the packs on the list. */
export function OpensSummary({ packs }: { packs: ProspectPackDto[] }) {
  const live = packs.filter(isLive);
  if (live.length === 0) return null;
  const opened = live.filter((p) => p.opens.count > 0).length;
  const total = live.reduce((sum, p) => sum + p.opens.count, 0);
  return (
    <p className="px-1 text-[12px] tabular-nums text-app-muted">
      Links opened: {opened} of {live.length} ({Math.round((opened / live.length) * 100)}%) · {total} {total === 1 ? 'open' : 'opens'} in all
    </p>
  );
}
