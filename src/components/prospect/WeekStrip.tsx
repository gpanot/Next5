'use client';

import type { ProspectViewDay } from '../../types/admin/prospects';
import { PostCard } from './PostCard';
import { chipDay, kindLine, monthDay, postTime } from './postLabels';

/** The posts, one a day: 2 a row on phones (all of them in view, no sideways scroll), 4 on tablets, 7 on desktop. */
export function WeekStrip({ days, onOpen }: { days: ProspectViewDay[]; onOpen: (index: number) => void }) {
  const first = days[0];
  const last = days.at(-1);
  return (
    <section id="week" className="scroll-mt-4 pb-5 pt-12">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="m-0 font-display text-[clamp(1.7rem,5vw,2.6rem)] font-[800] leading-[1.05] tracking-[-0.03em] text-app-ink">
            {first && last ? `Your ${days.length} days, ${monthDay(first.at)} to ${monthDay(last.at)}` : 'Your posts'}
          </h2>
          <p className="m-0 text-[15px] text-app-muted">Tap any post to watch it.</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-4 p-0 pb-4 pt-1 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((d, i) => (
            <li key={`${d.day}-${d.kind}`} className="flex min-w-0 flex-col gap-2">
              <PostCard day={d} onOpen={() => onOpen(i)} />
              <div className="px-0.5 text-[12px] leading-snug sm:text-[13px]">
                <p className="m-0 truncate font-semibold text-app-ink">{chipDay(d.at)} at {postTime(d.at)}</p>
                <p className="m-0 truncate text-app-muted">{kindLine(d)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
