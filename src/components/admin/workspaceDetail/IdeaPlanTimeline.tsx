'use client';

import { useState } from 'react';
import type { IdeaPlanItemDto } from '../../../types/admin/workspaceDetail';
import { StageChip } from './StageChip';

const STATUS_STYLES: Record<string, string> = {
  kept: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  made: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  discarded: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const FORMAT_STYLES: Record<IdeaPlanItemDto['format'], string> = {
  blitz: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  slideshow: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
};

const dayOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function Details({ item }: { item: IdeaPlanItemDto }) {
  return (
    <div className="space-y-2 border-t border-line px-3 py-3 text-sm dark:border-zinc-800">
      {item.meat.length > 0 && (
        <ol className="space-y-1 border-l-2 border-line pl-3 dark:border-zinc-700">
          {item.meat.map((m) => (
            <li key={m.label} className="text-ink dark:text-zinc-200"><span className="text-xs text-muted">{m.label}: </span>{m.text}</li>
          ))}
        </ol>
      )}
      {item.outline.length > 0 && (
        <ol className="list-decimal space-y-1 pl-5 text-ink dark:text-zinc-200">
          {item.outline.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}
        </ol>
      )}
      {item.cta && <p className="font-medium text-ink dark:text-zinc-100"><span className="text-xs text-muted">CTA: </span>{item.cta}</p>}
      {item.otherHooks.length > 0 && (
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Other first lines</span>
          <ul className="mt-1 space-y-0.5 text-muted">
            {item.otherHooks.map((h) => <li key={h}>· {h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function PlanRow({ item }: { item: IdeaPlanItemDto }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 w-full gap-3 px-3 py-2.5 text-left transition active:scale-[0.99]">
        <span className="w-16 shrink-0 text-xs font-semibold text-muted">
          <span className="block text-ink dark:text-zinc-100">{dayOf(item.plannedAt)}</span>
          {timeOf(item.plannedAt)}
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${FORMAT_STYLES[item.format]}`}>{item.format === 'blitz' ? 'Blitz' : 'Slideshow'}</span>
            <StageChip stage={item.stage} />
            {item.story && <span className="text-[11px] font-semibold text-muted">{item.story}</span>}
            {item.storyFormat && <span className="text-[11px] text-muted">· {item.storyFormat}</span>}
            {item.kind && <span className="text-[11px] text-muted">· {item.kind}</span>}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[item.status] ?? 'bg-zinc-100 text-muted dark:bg-zinc-800'}`}>{item.status}</span>
          </span>
          <span className="block text-sm font-semibold text-ink dark:text-zinc-100">{item.hook || '—'}</span>
        </span>
      </button>
      {open && <Details item={item} />}
    </li>
  );
}

/** A plan row, under its campaign week's heading when the week changes. */
function PlanEntry({ item, newWeek }: { item: IdeaPlanItemDto; newWeek: boolean }) {
  return (
    <>
      {newWeek && <li className="pt-2 text-xs font-bold uppercase tracking-wide text-muted">{item.week}</li>}
      <PlanRow item={item} />
    </>
  );
}

/** The workspace's calendar ideas day by day (admin only; the user's calendar shows no plan). Tap a row for its slides. */
export function IdeaPlanTimeline({ plan }: { plan: IdeaPlanItemDto[] }) {
  if (plan.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted dark:border-zinc-800">No ideas planned in the last week or ahead.</p>;
  }
  const stories = new Set(plan.map((p) => p.story).filter(Boolean)).size;
  const stageCounts = ['Attention', 'Trust', 'Proof', 'Conversion'].map((s) => `${plan.filter((p) => p.stage === s).length} ${s.toLowerCase()}`).join(' · ');
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-ink dark:text-zinc-100">Calendar plan</h3>
        <p className="text-xs text-muted">
          {plan.length} ideas · {plan.filter((p) => p.format === 'blitz').length} Blitz from {stories} stories · {plan.filter((p) => p.format === 'slideshow').length} slideshows
        </p>
        <p className="text-xs text-muted">{stageCounts}</p>
      </div>
      <ul className="space-y-2">
        {plan.map((item, i) => (
          <PlanEntry key={item.id} item={item} newWeek={i === 0 || plan[i - 1]!.week !== item.week} />
        ))}
      </ul>
    </section>
  );
}
