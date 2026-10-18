'use client';

import type { ProspectViewDay } from '../../types/admin/prospects';
import { dayLabel, KIND_LABEL } from './postLabels';

/** The play mark on a video's thumbnail. */
const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="drop-shadow">
    <circle cx="12" cy="12" r="11" fill="rgb(0 0 0 / 0.45)" />
    <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="#fff" />
  </svg>
);

/** One day: its 9:16 thumbnail, date, kind and first line. Tap opens the post. */
function DayRow({ day, onOpen }: { day: ProspectViewDay; onOpen: () => void }) {
  const thumb = day.slides[0] ?? null;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl border border-app-line bg-app-panel p-2 text-left shadow-sm transition hover:border-app-ink/30 active:scale-[0.99]">
        <div className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 links that expire */}
          {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
          {day.kind === 'blitz' && <span className="absolute inset-0 flex items-center justify-center"><PlayIcon /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
            Day {day.day} · {dayLabel(day.at)}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-app-ink">{day.title || KIND_LABEL[day.kind]}</p>
          <span className="mt-1 inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-app-ink dark:bg-zinc-800">{KIND_LABEL[day.kind]}</span>
        </div>
      </button>
    </li>
  );
}

/** The 14 days, first day first. */
export function DayList({ days, onOpen }: { days: ProspectViewDay[]; onOpen: (index: number) => void }) {
  return (
    <ul className="space-y-2">
      {days.map((d, i) => <DayRow key={`${d.day}-${d.kind}`} day={d} onOpen={() => onOpen(i)} />)}
    </ul>
  );
}
